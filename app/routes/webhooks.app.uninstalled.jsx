import { authenticate } from "../shopify.server";
import db from "../db.server";
import jwt from "jsonwebtoken";

export const action = async ({ request }) => {
  const { shop, session, topic, admin } =
    await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  try {
    /**
     * 1️⃣ Delete Shopify sessions
     */
    if (session) {
      await db.session.deleteMany({ where: { shop } });
      console.log("Sessions deleted");
    }

    /**
     * 2️⃣ Delete shop metafield (my_app.settings)
     */
    try {
      // First get metafield ID
      const metafieldsResponse = await admin.graphql(`
        {
          shop {
            metafield(namespace: "my_app", key: "settings") {
              id
            }
          }
        }
      `);

      const metafieldsJson = await metafieldsResponse.json();
      const metafieldId =
        metafieldsJson?.data?.shop?.metafield?.id;

      if (metafieldId) {
        await admin.graphql(`
          mutation {
            metafieldDelete(input: { id: "${metafieldId}" }) {
              deletedId
              userErrors {
                field
                message
              }
            }
          }
        `);

        console.log("Metafield deleted");
      }
    } catch (err) {
      console.error("Metafield deletion failed:", err);
    }

    /**
     * 3️⃣ Call external backend DELETE route
     */
    const token = jwt.sign(
      { shop },
      process.env.SHOPIFY_API_SECRET,
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