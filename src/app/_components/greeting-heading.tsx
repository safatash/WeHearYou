"use client";

import { useEffect, useState } from "react";

export function GreetingHeading({ name }: { name: string }) {
  const [greeting, setGreeting] = useState(`Good day, ${name}`);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting(`Good morning, ${name}`);
    else if (hour < 18) setGreeting(`Good afternoon, ${name}`);
    else setGreeting(`Good evening, ${name}`);
  }, [name]);

  return <>{greeting}</>;
}
