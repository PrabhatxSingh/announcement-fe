import { authenticate } from "../shopify.server";
import db from "../db.server";
import jwt from "jsonwebtoken";

export const action = async ({ request }) => {
  const { shop, session, topic } =
    await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  try {
    /**
     * 1️⃣ Delete Shopify session
     */
    if (session) {
      await db.session.deleteMany({ where: { shop } });
      console.log("Sessions deleted");
    }

    /**
     * 2️⃣ Call external backend DELETE route
     */
    const token = jwt.sign(
      { shop },
      process.env.SHOPIFY_API_SECRET, // must match backend secret
      { expiresIn: "5m" }
    );

    await fetch("https://announcement-be.onrender.com/api/announcement", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("Backend announcement deleted");
  } catch (error) {
    console.error("Uninstall cleanup error:", error);
  }

  return new Response();
};
