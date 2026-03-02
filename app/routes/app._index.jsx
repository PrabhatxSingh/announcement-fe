import jwt from "jsonwebtoken";
import { useEffect, useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

/* -------------------------------------------------------------------------- */
/* LOADER                                                                     */
/* -------------------------------------------------------------------------- */

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(`
    query {
      shop {
        id
        settings: metafield(namespace: "my_app", key: "settings") {
          value
        }
      }
    }
  `);

  const data = await response.json();
  const shop = data.data.shop;

  const defaultSettings = {
    announcements: ["Welcome to our store"],
    bgColor1: "#000000",
    bgColor2: "#222222",
    useGradient: true,
    gradientAngle: 270,
    textColor: "#ffffff",
    fadeSize: 0,
    ctaText: "Shop Now",
    ctaUrl: "#",
    ctaBg: "#ffffff",
    ctaTextColor: "#000000",
    ctaRadius: 20,
  };

  if (!shop.settings?.value) {
    return defaultSettings;
  }

  return {
    ...defaultSettings,
    ...JSON.parse(shop.settings.value),
  };
};

/* -------------------------------------------------------------------------- */
/* ACTION                                                                     */
/* -------------------------------------------------------------------------- */

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();

  const settings = {
    announcements: JSON.parse(formData.get("announcements")),
    bgColor1: formData.get("bg_color"),
    textColor: formData.get("text_color"),
    bgColor2: formData.get("bgColor2"),
    useGradient: formData.get("useGradient") === "true",
    gradientAngle: Number(formData.get("gradientAngle")),
    fadeSize: Number(formData.get("fadeSize")),
    ctaText: formData.get("ctaText"),
    ctaUrl: formData.get("ctaUrl"),
    ctaBg: formData.get("ctaBg"),
    ctaTextColor: formData.get("ctaTextColor"),
    ctaRadius: Number(formData.get("ctaRadius")),
  };

  const shopResponse = await admin.graphql(`query { shop { id } }`);
  const shopData = await shopResponse.json();
  const shopId = shopData.data.shop.id;

  await admin.graphql(
    `mutation SetMetafields($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id }
      }
    }`,
    {
      variables: {
        metafields: [
          {
            namespace: "my_app",
            key: "settings",
            ownerId: shopId,
            type: "json",
            value: JSON.stringify(settings),
          },
        ],
      },
    }
  );

  try {
    const token = jwt.sign(
      { shop: session.shop },
      process.env.SHOPIFY_API_SECRET,
      { expiresIn: "5m" }
    );

    await fetch(process.env.BE_URI + "/api/announcement", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ settings }),
    });
  } catch (err) {
    console.error("Backend sync error:", err);
  }

  return { success: true };
};

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

export default function Index() {
  const loaderData = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  /* ---------------- Messages ---------------- */
  const [announcements, setAnnouncements] = useState(
    loaderData.announcements || ["Welcome to our store"]
  );

  /* ---------------- Appearance ---------------- */
  const [bgColor1, setBgColor1] = useState(loaderData.bg_color || "#000000");
  const [bgColor2, setBgColor2] = useState("#222222");
  const [useGradient, setUseGradient] = useState(true);
  const [gradientAngle, setGradientAngle] = useState(270);

  const [textColor, setTextColor] = useState(
    loaderData.text_color || "#ffffff"
  );
  const [fadeSize, setFadeSize] = useState(10);

  /* ---------------- CTA ---------------- */
  const [ctaText, setCtaText] = useState("Shop Now");
  const [ctaUrl, setCtaUrl] = useState("#");
  const [ctaBg, setCtaBg] = useState("#ffffff");
  const [ctaTextColor, setCtaTextColor] = useState("#000000");
  const [ctaRadius, setCtaRadius] = useState(20);

  const isLoading =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Announcement updated successfully");
    }
  }, [fetcher.data, shopify]);

  useEffect(() => {
    const slider = document.querySelector(".preview-slider");
    if (!slider) return;

    let index = 0;
    const total = announcements.filter(Boolean).length;
    const autoDelay = 3000;

    if (total <= 1) return;

    function move() {
      slider.style.transition = "transform 0.8s ease";
      slider.style.transform = `translateX(-${index * 100}%)`;
    }

    function next() {
      index = (index + 1) % total;
      move();
    }

    const interval = setInterval(next, autoDelay);

    return () => clearInterval(interval);

  }, [announcements]);

  /* ---------------- Handlers ---------------- */

  const addText = () => setAnnouncements([...announcements, ""]);

  const updateText = (index, value) => {
    const updated = [...announcements];
    updated[index] = value.slice(0, 150);
    setAnnouncements(updated);
  };

  const removeText = (index) => {
    setAnnouncements(announcements.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    fetcher.submit(
      {
        announcements: JSON.stringify(announcements),
        bg_color: bgColor1,
        text_color: textColor,
        bgColor2,
        useGradient,
        gradientAngle,
        fadeSize,
        ctaText,
        ctaUrl,
        ctaBg,
        ctaTextColor,
        ctaRadius,
      },
      { method: "POST" }
    );
  };

  const backgroundStyle = useGradient
    ? `linear-gradient(${gradientAngle}deg, ${bgColor1}, ${bgColor2})`
    : bgColor1;

  const visibleSlides = announcements.filter(Boolean);
  const showArrows = visibleSlides.length > 2;

  return (
    <s-page heading="Premium Animated Marquee">

      {/* ---------------- Messages ---------------- */}
      <s-section heading="Messages">
        <s-stack direction="block" gap="large">
          {announcements.map((text, index) => (
            <s-stack key={index} direction="inline" gap="small">
              <s-text-field
                value={text}
                maxlength="150"
                onInput={(e) => updateText(index, e.target.value)}
              />
              <s-button tone="critical" onClick={() => removeText(index)}>
                Remove
              </s-button>
            </s-stack>
          ))}
          <s-button onClick={addText}>Add Message</s-button>
        </s-stack>
      </s-section>

      {/* ---------------- Appearance ---------------- */}
      <s-section heading="Appearance">
        <s-stack direction="block" gap="large">

          <div className="admin-toggle">
            <button
              className={!useGradient ? "active" : ""}
              onClick={() => setUseGradient(false)}
            >
              Solid
            </button>
            <button
              className={useGradient ? "active" : ""}
              onClick={() => setUseGradient(true)}
            >
              Gradient
            </button>
          </div>

          <s-stack direction="inline" gap="large">

            <s-stack direction="block" gap="small">
              <s-text variant="bodyMd">Background Color 1</s-text>
              <s-color-picker
                value={bgColor1}
                onChange={(e) => setBgColor1(e.currentTarget.value)}
              />
            </s-stack>

            {useGradient && (
              <s-stack direction="block" gap="small">
                <s-text variant="bodyMd">Background Color 2</s-text>
                <s-color-picker
                  value={bgColor2}
                  onChange={(e) => setBgColor2(e.currentTarget.value)}
                />
              </s-stack>
            )}

            <s-stack direction="block" gap="small">
              <s-text variant="bodyMd">Text Color</s-text>
              <s-color-picker
                value={textColor}
                onChange={(e) => setTextColor(e.currentTarget.value)}
              />
            </s-stack>

          </s-stack>

          {useGradient && (
            <s-text-field
              type="number"
              label="Gradient Angle"
              value={gradientAngle}
              onInput={(e) => setGradientAngle(e.target.value)}
            />
          )}

          <s-text-field
            type="number"
            label="Side Fade Size (%)"
            value={fadeSize}
            onInput={(e) => setFadeSize(e.target.value)}
          />

        </s-stack>
      </s-section>

      {/* ---------------- CTA ---------------- */}
      <s-section heading="CTA Button">
        <s-text-field label="Text" value={ctaText} onInput={(e) => setCtaText(e.target.value)} />
        <s-text-field label="URL" value={ctaUrl} onInput={(e) => setCtaUrl(e.target.value)} />
        <s-stack direction="inline" gap="large">

          <s-stack direction="block" gap="small">
            <s-text variant="bodyMd">CTA Background</s-text>
            <s-color-picker
              value={ctaBg}
              onChange={(e) => setCtaBg(e.currentTarget.value)}
            />
          </s-stack>

          <s-stack direction="block" gap="small">
            <s-text variant="bodyMd">CTA Text Color</s-text>
            <s-color-picker
              value={ctaTextColor}
              onChange={(e) => setCtaTextColor(e.currentTarget.value)}
            />
          </s-stack>

        </s-stack>
        <div style={{ marginTop: "4px" }}
        >

          <s-text-field
            type="number"
            label="Border Radius (px)"
            value={ctaRadius}
            onInput={(e) => setCtaRadius(e.target.value)}
          />
        </div>
      </s-section>

      {/* ---------------- Live Preview ---------------- */}
      <s-section heading="Live Preview">
        <div
          className="preview-wrapper"
          style={{
            background: backgroundStyle,
            color: textColor,
            maskImage: `linear-gradient(to right,
        transparent 0%,
        black ${fadeSize}%,
        black ${100 - fadeSize}%,
        transparent 100%)`,
          }}
        >
          {showArrows && (
            <>
              <button className="preview-arrow left">&#10094;</button>
              <button className="preview-arrow right">&#10095;</button>
            </>
          )}

          <div className="preview-track-container">
            <div className="preview-slider">
              {announcements.filter(Boolean).map((text, index) => (
                <div key={index} className="preview-slide">
                  {text}
                  {ctaText && (
                    <a
                      href={ctaUrl}
                      target="_blank"
                      style={{
                        marginLeft: 12,
                        padding: "4px 12px",
                        background: ctaBg,
                        color: ctaTextColor,
                        borderRadius: `${ctaRadius}px`,
                        fontSize: "13px",
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {ctaText}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <style>{`
          .preview-wrapper {
            position: relative;
            overflow: hidden;
            padding: 8px 40px;
            display: flex;
            align-items: center;
            font-size: 14px;
            font-weight: 500;
          }

          .preview-track-container {
            overflow: hidden;
            width: 100%;
          }

          .preview-slider {
            display: flex;
            transition: transform 0.8s ease;
          }

          .preview-slide {
            flex: 0 0 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
            text-align: center;
          }

          .preview-arrow {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(0,0,0,0.4);
            color: white;
            border: none;
            padding: 4px 8px;
            cursor: pointer;
            border-radius: 20px;
            font-size: 12px;
            z-index: 10;
          }

          .preview-arrow.left { left: 10px; }
          .preview-arrow.right { right: 10px; }
        `}</style>
      </s-section>

      <style>{`
        .admin-toggle {
          display: flex;
          gap: 10px;
        }

        .admin-toggle button {
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid #ccc;
          background: white;
          cursor: pointer;
        }

        .admin-toggle button.active {
          background: black;
          color: white;
          border-color: black;
        }
      `}</style>

      <s-section>
        <s-button variant="primary" onClick={handleSubmit} loading={isLoading}>
          Save Changes
        </s-button>
      </s-section>

    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};