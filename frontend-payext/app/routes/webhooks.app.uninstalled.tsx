import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Phase 1: Log only (no DB cleanup needed)
  // Phase 2+: May add cleanup logic if needed

  return new Response();
};
