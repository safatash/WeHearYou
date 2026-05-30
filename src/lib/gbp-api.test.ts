import assert from "node:assert/strict";
import test from "node:test";
import {
  publishGbpReply,
  createGbpPost,
  deleteGbpPost,
  uploadGbpPhoto,
  deleteGbpPhoto,
  listGbpQuestions,
  answerGbpQuestion,
} from "./gbp-api.ts";

const TOKEN = "test-access-token";

function mockFetch(status: number, body: unknown) {
  return async (_url: string | URL | Request, _options?: RequestInit) => {
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(body),
      json: async () => body,
    } as Response;
  };
}

test("publishGbpReply sends PUT to correct URL", async () => {
  let calledUrl = "";
  let calledBody = "";
  global.fetch = async (url: string | URL | Request, options?: RequestInit) => {
    calledUrl = url.toString();
    calledBody = options?.body as string;
    return { ok: true, status: 200, text: async () => "{}", json: async () => ({}) } as Response;
  };

  await publishGbpReply(TOKEN, "accounts/123/locations/456/reviews/789", "Great review!");

  assert.equal(calledUrl, "https://mybusiness.googleapis.com/v4/accounts/123/locations/456/reviews/789/reply");
  assert.deepEqual(JSON.parse(calledBody), { comment: "Great review!" });
});

test("publishGbpReply throws on non-2xx response", async () => {
  global.fetch = mockFetch(403, { error: { message: "Forbidden" } }) as typeof fetch;

  await assert.rejects(
    () => publishGbpReply(TOKEN, "accounts/123/locations/456/reviews/789", "Reply"),
    /GBP publishReply failed \(403\): Forbidden/
  );
});

test("createGbpPost sends POST and returns gbpPostId", async () => {
  let calledUrl = "";
  let parsedBody: unknown;
  global.fetch = async (url: string | URL | Request, options?: RequestInit) => {
    calledUrl = url.toString();
    parsedBody = JSON.parse(options?.body as string);
    return { ok: true, status: 200, text: async () => "", json: async () => ({ name: "accounts/123/locations/456/localPosts/abc" }) } as Response;
  };

  const id = await createGbpPost(TOKEN, "accounts/123/locations/456", {
    postType: "WHATS_NEW",
    content: "Hello world",
  });

  assert.equal(calledUrl, "https://mybusiness.googleapis.com/v4/accounts/123/locations/456/localPosts");
  assert.equal(id, "accounts/123/locations/456/localPosts/abc");
  assert.equal((parsedBody as Record<string, unknown>).topicType, "STANDARD");
  assert.equal((parsedBody as Record<string, unknown>).summary, "Hello world");
});

test("createGbpPost maps OFFER postType to topicType OFFER", async () => {
  let parsedBody: unknown;
  global.fetch = async (_url: string | URL | Request, options?: RequestInit) => {
    parsedBody = JSON.parse(options?.body as string);
    return { ok: true, status: 200, text: async () => "", json: async () => ({ name: "x" }) } as Response;
  };

  await createGbpPost(TOKEN, "accounts/123/locations/456", { postType: "OFFER", content: "50% off" });
  assert.equal((parsedBody as Record<string, unknown>).topicType, "OFFER");
});

test("deleteGbpPost sends DELETE to the post name", async () => {
  let calledUrl = "";
  global.fetch = async (url: string | URL | Request) => {
    calledUrl = url.toString();
    return { ok: true, status: 200, text: async () => "", json: async () => ({}) } as Response;
  };

  await deleteGbpPost(TOKEN, "accounts/123/locations/456/localPosts/abc");
  assert.equal(calledUrl, "https://mybusiness.googleapis.com/v4/accounts/123/locations/456/localPosts/abc");
});

test("deleteGbpPost does not throw on 404", async () => {
  global.fetch = mockFetch(404, {}) as typeof fetch;
  await assert.doesNotReject(() => deleteGbpPost(TOKEN, "posts/notfound"));
});

test("uploadGbpPhoto sends correct body and returns media name", async () => {
  let parsedBody: unknown;
  global.fetch = async (_url: string | URL | Request, options?: RequestInit) => {
    parsedBody = JSON.parse(options?.body as string);
    return { ok: true, status: 200, text: async () => "", json: async () => ({ name: "accounts/123/locations/456/media/m1" }) } as Response;
  };

  const id = await uploadGbpPhoto(TOKEN, "accounts/123/locations/456", "https://cdn.example.com/photo.jpg", "EXTERIOR");
  assert.equal(id, "accounts/123/locations/456/media/m1");
  assert.equal((parsedBody as Record<string, unknown>).mediaFormat, "PHOTO");
  assert.equal((parsedBody as Record<string, unknown>).sourceUrl, "https://cdn.example.com/photo.jpg");
  assert.deepEqual((parsedBody as Record<string, unknown>).locationAssociation, { category: "EXTERIOR" });
});

test("listGbpQuestions returns questions array", async () => {
  global.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => "",
    json: async () => ({
      questions: [
        { name: "accounts/123/locations/456/questions/q1", text: "Are you open Sundays?", createTime: "2024-01-01T00:00:00Z" },
      ],
    }),
  }) as Response;

  const questions = await listGbpQuestions(TOKEN, "accounts/123/locations/456");
  assert.equal(questions.length, 1);
  assert.equal(questions[0].text, "Are you open Sundays?");
});

test("listGbpQuestions returns empty array when no questions", async () => {
  global.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => "",
    json: async () => ({}),
  }) as Response;

  const questions = await listGbpQuestions(TOKEN, "accounts/123/locations/456");
  assert.deepEqual(questions, []);
});

test("answerGbpQuestion sends PATCH with answer text", async () => {
  let parsedBody: unknown;
  let calledUrl = "";
  global.fetch = async (url: string | URL | Request, options?: RequestInit) => {
    calledUrl = url.toString();
    parsedBody = JSON.parse(options?.body as string);
    return { ok: true, status: 200, text: async () => "", json: async () => ({ name: "accounts/123/locations/456/questions/q1/answers/a1" }) } as Response;
  };

  const answerId = await answerGbpQuestion(TOKEN, "accounts/123/locations/456/questions/q1", "Yes, open 10am–5pm.");
  assert.equal(calledUrl, "https://mybusiness.googleapis.com/v4/accounts/123/locations/456/questions/q1/answers/");
  assert.deepEqual(parsedBody, { answer: { text: "Yes, open 10am–5pm." } });
  assert.equal(answerId, "accounts/123/locations/456/questions/q1/answers/a1");
});
