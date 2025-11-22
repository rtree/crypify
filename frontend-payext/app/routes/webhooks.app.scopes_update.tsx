import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { payload, topic, shop } = await authenticate.webhook(request);
    console.log(`Received ${topic} webhook for ${shop}`);

    const current = payload.current as string[];
    console.log(`Updated scopes: ${current.toString()}`);

    // Phase 1: Log only (no DB update needed)
    // Phase 2+: May add scope tracking if needed

    return new Response();
};
