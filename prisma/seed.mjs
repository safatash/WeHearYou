import bcrypt from "bcryptjs";
import { PrismaClient, ContactSource, ContactStatus, PreferredChannel, CampaignStatus, ReviewSource, ReviewStatus, AutomationTriggerType, AutomationStepType, MembershipRole, MembershipStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "nova-dental" },
    update: {},
    create: {
      name: "Nova Dental",
      slug: "nova-dental",
      website: "https://wehearyou.app",
    },
  });

  const demoPasswordHash = await bcrypt.hash("demo1234", 10);

  const user = await prisma.user.upsert({
    where: { email: "safa@wehearyou.app" },
    update: {
      passwordHash: demoPasswordHash,
    },
    create: {
      name: "Safa Tash",
      email: "safa@wehearyou.app",
      passwordHash: demoPasswordHash,
    },
  });

  const ownerMembership = await prisma.userMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      userId: user.id,
      role: MembershipRole.OWNER,
      status: MembershipStatus.ACTIVE,
      accessScope: "All locations",
    },
  });

  const maya = await prisma.user.upsert({
    where: { email: "maya@novadental.com" },
    update: {},
    create: {
      name: "Maya Chen",
      email: "maya@novadental.com",
    },
  });

  const alex = await prisma.user.upsert({
    where: { email: "alex@novadental.com" },
    update: {},
    create: {
      name: "Alex Rivera",
      email: "alex@novadental.com",
    },
  });

  const jordan = await prisma.user.upsert({
    where: { email: "jordan@agencyops.co" },
    update: {},
    create: {
      name: "Jordan Lee",
      email: "jordan@agencyops.co",
    },
  });

  const mayaMembership = await prisma.userMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: maya.id,
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      userId: maya.id,
      role: MembershipRole.MANAGER,
      status: MembershipStatus.ACTIVE,
      accessScope: "Queens only",
    },
  });

  const alexMembership = await prisma.userMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: alex.id,
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      userId: alex.id,
      role: MembershipRole.MANAGER,
      status: MembershipStatus.INVITED,
      accessScope: "Jersey City only",
    },
  });

  const jordanMembership = await prisma.userMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: jordan.id,
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      userId: jordan.id,
      role: MembershipRole.ANALYST,
      status: MembershipStatus.ACTIVE,
      accessScope: "Reporting only",
    },
  });

  const brooklyn = await prisma.location.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: "brooklyn" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "Nova Dental, Brooklyn",
      slug: "brooklyn",
      city: "Brooklyn",
      state: "NY",
      status: "Active",
      reviewLink: "https://g.page/r/brooklyn-demo",
      managerName: "Safa",
      avgRating: 4.8,
    },
  });

  const queens = await prisma.location.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: "queens" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "Nova Dental, Queens",
      slug: "queens",
      city: "Queens",
      state: "NY",
      status: "Active",
      reviewLink: "https://g.page/r/queens-demo",
      managerName: "Maya Chen",
      avgRating: 4.6,
    },
  });

  const jerseyCity = await prisma.location.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: "jersey-city" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "Nova Dental, Jersey City",
      slug: "jersey-city",
      city: "Jersey City",
      state: "NJ",
      status: "Launching",
      reviewLink: "https://g.page/r/jersey-demo",
      managerName: "Alex Rivera",
      avgRating: 4.4,
    },
  });

  for (const assignment of [
    { membershipId: ownerMembership.id, locationId: brooklyn.id },
    { membershipId: ownerMembership.id, locationId: queens.id },
    { membershipId: ownerMembership.id, locationId: jerseyCity.id },
    { membershipId: mayaMembership.id, locationId: queens.id },
    { membershipId: alexMembership.id, locationId: jerseyCity.id },
  ]) {
    await prisma.membershipLocationAccess.upsert({
      where: {
        membershipId_locationId: assignment,
      },
      update: {},
      create: assignment,
    });
  }

  void jordanMembership;

  await prisma.locationPublicProfile.upsert({
    where: { locationId: brooklyn.id },
    update: {},
    create: {
      locationId: brooklyn.id,
      headline: "Nova Dental Brooklyn",
      subheadline: "Modern dental care in Brooklyn with a smooth patient experience and trusted local reviews.",
      phone: "+1 (718) 555-0101",
      email: "brooklyn@novadental.com",
      addressLine1: "210 Atlantic Ave",
      postalCode: "11201",
      bookingUrl: "https://novadental.com/book/brooklyn",
      ctaLabel: "Book an appointment",
      ctaUrl: "https://novadental.com/book/brooklyn",
      theme: "light",
      businessType: "Dentist",
      showReviews: true,
      showTestimonials: true,
      showMap: true,
      schemaEnabled: true,
    },
  });

  await prisma.locationPublicProfile.upsert({
    where: { locationId: queens.id },
    update: {},
    create: {
      locationId: queens.id,
      headline: "Nova Dental Queens",
      subheadline: "Patient-first dental care in Queens, with trusted reviews and an easy path to book your next visit.",
      phone: "+1 (718) 555-0112",
      email: "queens@novadental.com",
      addressLine1: "88-12 Queens Blvd",
      postalCode: "11373",
      bookingUrl: "https://novadental.com/book/queens",
      ctaLabel: "Schedule now",
      ctaUrl: "https://novadental.com/book/queens",
      theme: "light",
      businessType: "Dentist",
      showReviews: true,
      showTestimonials: true,
      showMap: true,
      schemaEnabled: true,
    },
  });

  await prisma.locationPublicProfile.upsert({
    where: { locationId: jerseyCity.id },
    update: {},
    create: {
      locationId: jerseyCity.id,
      headline: "Nova Dental Jersey City",
      subheadline: "Launching soon in Jersey City, with a reputation-ready mini-site already set up for local trust building.",
      phone: "+1 (201) 555-0198",
      email: "jerseycity@novadental.com",
      addressLine1: "35 Newark Ave",
      postalCode: "07302",
      bookingUrl: "https://novadental.com/book/jersey-city",
      ctaLabel: "Join the waitlist",
      ctaUrl: "https://novadental.com/book/jersey-city",
      theme: "light",
      businessType: "Dentist",
      showReviews: true,
      showTestimonials: true,
      showMap: true,
      schemaEnabled: true,
    },
  });

  const tagRecords = [];

  for (const name of ["VIP", "Dental", "Physical Therapy", "Import", "Needs attention", "Project Complete", "New patient", "Whitening consult"]) {
    const tag = await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name },
    });

    tagRecords.push(tag);
  }

  const tagByName = Object.fromEntries(tagRecords.map((tag) => [tag.name, tag]));

  const contacts = [
    {
      id: "contact-emma-brooks",
      locationId: brooklyn.id,
      name: "Emma Brooks",
      email: "emma@example.com",
      phone: "+1 (555) 201-4411",
      source: ContactSource.MANUAL,
      status: ContactStatus.ACTIVE,
      preferredChannel: PreferredChannel.SMS,
      notes: "Often responds quickly to SMS review requests.",
      lastInvitedAt: new Date("2026-04-17T14:00:00.000Z"),
      tags: ["VIP", "Dental"],
    },
    {
      id: "contact-noah-kim",
      locationId: queens.id,
      name: "Noah Kim",
      email: "noah@example.com",
      phone: "+1 (555) 201-8821",
      source: ContactSource.WEBHOOK,
      status: ContactStatus.ACTIVE,
      preferredChannel: PreferredChannel.EMAIL,
      notes: "Came in via automation webhook after appointment_completed event.",
      lastInvitedAt: new Date("2026-04-17T13:00:00.000Z"),
      tags: ["Physical Therapy"],
    },
    {
      id: "contact-priya-patel",
      locationId: brooklyn.id,
      name: "Priya Patel",
      email: "priya@example.com",
      phone: "+1 (555) 778-3301",
      source: ContactSource.CSV_IMPORT,
      status: ContactStatus.NEEDS_FOLLOW_UP,
      preferredChannel: PreferredChannel.SMS,
      notes: "Left low-rating private feedback and should get manual outreach.",
      lastInvitedAt: new Date("2026-04-16T15:00:00.000Z"),
      tags: ["Import", "Needs attention"],
    },
    {
      id: "contact-marcus-lee",
      locationId: jerseyCity.id,
      name: "Marcus Lee",
      email: "marcus@example.com",
      phone: "+1 (555) 992-1188",
      source: ContactSource.WEBHOOK,
      status: ContactStatus.ACTIVE,
      preferredChannel: PreferredChannel.EMAIL,
      notes: "Driven by project_completed automation rule.",
      lastInvitedAt: new Date("2026-04-14T16:00:00.000Z"),
      tags: ["Project Complete"],
    },
    {
      id: "contact-olivia-bennett",
      locationId: brooklyn.id,
      name: "Olivia Bennett",
      email: "olivia.bennett@example.com",
      phone: "+1 (555) 314-8810",
      source: ContactSource.MANUAL,
      status: ContactStatus.ACTIVE,
      preferredChannel: PreferredChannel.SMS,
      notes: "Recently completed a whitening consultation. Best to follow up via SMS within 24 hours and include the Brooklyn location review funnel.",
      lastInvitedAt: null,
      tags: ["New patient", "Whitening consult"],
    },
  ];

  for (const contact of contacts) {
    await prisma.contact.upsert({
      where: { id: contact.id },
      update: {
        locationId: contact.locationId,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        source: contact.source,
        status: contact.status,
        preferredChannel: contact.preferredChannel,
        notes: contact.notes,
        lastInvitedAt: contact.lastInvitedAt,
      },
      create: {
        id: contact.id,
        locationId: contact.locationId,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        source: contact.source,
        status: contact.status,
        preferredChannel: contact.preferredChannel,
        notes: contact.notes,
        lastInvitedAt: contact.lastInvitedAt,
      },
    });

    for (const tagName of contact.tags) {
      await prisma.contactTag.upsert({
        where: {
          contactId_tagId: {
            contactId: contact.id,
            tagId: tagByName[tagName].id,
          },
        },
        update: {},
        create: {
          contactId: contact.id,
          tagId: tagByName[tagName].id,
        },
      });
    }
  }

  const campaign = await prisma.campaign.upsert({
    where: { id: "campaign-post-appointment-sms" },
    update: {},
    create: {
      id: "campaign-post-appointment-sms",
      locationId: brooklyn.id,
      name: "Post-appointment SMS push",
      channel: PreferredChannel.SMS,
      status: CampaignStatus.SENT,
      workflowName: "Manual send",
      sendAt: new Date("2026-04-16T19:10:00.000Z"),
      messageBody: "Hi there, thanks for visiting Nova Dental. We'd really appreciate your feedback.",
      emailSubject: "How was your visit?",
      destination: "4-5 stars redirect to Google, 1-3 stars collect private feedback",
    },
  });

  await prisma.campaignRecipient.upsert({
    where: { campaignId_contactId: { campaignId: campaign.id, contactId: "contact-emma-brooks" } },
    update: {},
    create: {
      campaignId: campaign.id,
      contactId: "contact-emma-brooks",
      token: "rr_tok_7df9e1a2",
      status: CampaignStatus.SENT,
      outcome: "Token created",
      sentAt: new Date("2026-04-16T19:10:00.000Z"),
    },
  });

  await prisma.campaignRecipient.upsert({
    where: { campaignId_contactId: { campaignId: campaign.id, contactId: "contact-priya-patel" } },
    update: {},
    create: {
      campaignId: campaign.id,
      contactId: "contact-priya-patel",
      token: "rr_tok_44fe2091",
      status: CampaignStatus.OPENED,
      outcome: "Waiting on rating",
      sentAt: new Date("2026-04-14T15:05:00.000Z"),
      openedAt: new Date("2026-04-14T15:40:00.000Z"),
    },
  });

  await prisma.review.upsert({
    where: { id: "review-ava-johnson" },
    update: {},
    create: {
      id: "review-ava-johnson",
      locationId: brooklyn.id,
      source: ReviewSource.GOOGLE,
      reviewerName: "Ava Johnson",
      rating: 5,
      status: ReviewStatus.PUBLISHED,
      sentiment: "positive",
      body: "Super easy experience, the team was fast and genuinely helpful.",
      reviewedAt: new Date("2026-04-17T18:14:00.000Z"),
    },
  });

  const automation = await prisma.automation.upsert({
    where: { id: "automation-appointment-followup" },
    update: {},
    create: {
      id: "automation-appointment-followup",
      organizationId: org.id,
      name: "Appointment follow-up",
      triggerType: AutomationTriggerType.APPOINTMENT_COMPLETED,
      isActive: true,
    },
  });

  await prisma.automationStep.upsert({
    where: { automationId_orderIndex: { automationId: automation.id, orderIndex: 1 } },
    update: {},
    create: {
      automationId: automation.id,
      stepType: AutomationStepType.DELAY,
      title: "Wait 2 hours",
      description: "Respect quiet hours before sending a request.",
      orderIndex: 1,
      configJson: { delayHours: 2 },
    },
  });

  await prisma.automationStep.upsert({
    where: { automationId_orderIndex: { automationId: automation.id, orderIndex: 2 } },
    update: {},
    create: {
      automationId: automation.id,
      stepType: AutomationStepType.SEND_REQUEST,
      title: "Send SMS Review Request",
      description: "Send the branded review funnel invite using the tokenized SMS request path.",
      orderIndex: 2,
      configJson: {
        channel: "SMS",
        template: "Post-appointment invite",
        funnelUrl: "tokenized link",
      },
    },
  });

  await prisma.automationStep.upsert({
    where: { automationId_orderIndex: { automationId: automation.id, orderIndex: 3 } },
    update: {},
    create: {
      automationId: automation.id,
      stepType: AutomationStepType.NOTIFY_TEAM,
      title: "Notify team on negative feedback",
      description: "Alert the location manager when low-rating private feedback is submitted.",
      orderIndex: 3,
      configJson: {
        trigger: "private_feedback",
        channel: "internal",
        audience: "location manager",
      },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
