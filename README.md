# Shopify Announcement Bar App

A basic Shopify app that adds a customizable announcement bar to a store using an App Embed.

---

## Requirements

- Node.js (v18 or higher recommended)
- npm or yarn
- Shopify CLI
- Shopify Partner account
- Development store

Install Shopify CLI (if not installed):

npm install -g @shopify/cli @shopify/app

---

## Installation

### 1. Clone the repository

git clone https://github.com/PrabhatxSingh/announcement-fe.git
cd your-app

### 2. Install dependencies

npm install

or

yarn install

---

## Environment Variables

Create a `.env` file in the root directory and add:

SHOPIFY_API_KEY=your_api_key  
SHOPIFY_API_SECRET=your_api_secret  
SCOPES=read_metafields,write_metafields  

Get your API credentials from the Shopify Partner Dashboard.

---

## Run the App (Development)

Start the development server:

shopify app dev

This will:
- Start a local server
- Create a secure tunnel
- Install the app in your development store

---

## Enable the Announcement Bar

1. Go to Online Store  
2. Click Customize  
3. Open App Embeds  
4. Enable "Announcement Bar"  
5. Click Save  

---

## Metafield Configuration

The app reads settings from a shop metafield:

Namespace: my_app  
Key: settings  
Type: JSON  

Example value:

{
  "announcements": ["Welcome to our store", "Free shipping on orders over $50"],
  "bgColor1": "#000000",
  "bgColor2": "#222222",
  "useGradient": true
}

---

## Deploy to Production

When ready to deploy:

shopify app deploy

Make sure your HOST variable is updated to your production URL before deploying.

---