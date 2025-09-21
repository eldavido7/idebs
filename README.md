# 🌿 IDEBS – eCommerce Admin Dashboard & Storefront

IDEBS is a full-featured herbal products eCommerce system built with **Next.js**, **Prisma**, **PostgreSQL**, **Neon**, **Cloudinary**, and **Paystack**. It includes a powerful admin dashboard and a lightweight public storefront. Customers can place orders and receive real-time email updates as their order progresses.

---

## 🚀 Features

### 🛒 Storefront
- Public-facing store with all available products
- Add-to-cart, checkout, and Paystack payment integration
- Order confirmation with receipt
- No user authentication needed – orders are tracked by customer input

### 🧑‍💼 Admin Dashboard
- Product management (CRUD with image uploads via Cloudinary)
- Orders module with:
  - Full CRUD support
  - Product snapshot at the time of order
  - Status updates: `pending` → `processing` → `shipped` → `delivered` / `cancelled`
  - Email notifications sent to customer on every status change
- Discount and gift code management
- Inventory tracking and low stock alerts
- Revenue analytics and charts
- Shipping settings and admin user management
- Secure admin authentication

---

## ⚙️ Technologies Used

- **Next.js** – Fullstack framework
- **Prisma** – ORM for PostgreSQL
- **Neon** – Scalable PostgreSQL database
- **Zustand** – Lightweight state management
- **Cloudinary** – Image hosting and CDN
- **Paystack** – Payment gateway integration
- **NodeMailer** – Email notifications
- **Tailwind CSS** – Styling

---

## 🛠️ Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/halamin-herbal.git
cd halamin-herbal
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set up Environment Variables
Create a .env file in the root with the following:
```bash
DATABASE_URL=your-neon-db-url
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
PAYSTACK_SECRET_KEY=your-paystack-secret-key
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your-paystack-public-key
NEXT_PUBLIC_BASE_URL=http://localhost:3000/your-endpoint-url
GMAIL_USER=your-gmail-address
GMAIL_APP_PASSWORD=your-google-app-password
STORE_NAME=your-store-name
```
You must create accounts on Neon (or local postgre sql instance), Cloudinary, Paystack, and generate a Gmail App Password to use these services.

---

### 🔐 How to Generate a Gmail App Password
```bash
1. **Enable 2-Step Verification**
   - Go to [https://myaccount.google.com/security](https://myaccount.google.com/security)
   - Under **"Signing in to Google"**, enable **2-Step Verification** if not already enabled.

2. **Generate App Password**
   - After enabling 2FA, go back to [https://myaccount.google.com/security](https://myaccount.google.com/security)
   - Under **"Signing in to Google"**, click **App passwords**
   - Select:
     - App: **Mail**
     - Device: **Other (Custom name)** → e.g., `HalaminMailer`
   - Click **Generate**
   - Copy the **16-character app password** shown (e.g., `abcd efgh ijkl mnop`)
   - Use this value as `GMAIL_APP_PASSWORD` in your .env
```

### 4. Set Up the Database

```bash
npx prisma generate
npx prisma db push
```
This will create the necessary tables in your Neon PostgreSQL database.

### 5. Start the Development Server

```bash
npm run dev
```
Visit http://localhost:3000 to view the app locally.

---

## 👤 Admin User Setup (Important!)

Before logging into the admin dashboard, you need to manually create your first admin user.

### Option 1: Directly in the Database
Use a database GUI like **Neon**, **pgAdmin**, or **TablePlus** to insert a new user into the `User` table.

- Make sure the password is **hashed** using **bcrypt** (10-digit salt)
- You can generate the hash using a tool like https://bcrypt-generator.com or via Node.js:

```bash
const bcrypt = require('bcrypt');
bcrypt.hash('your-password', 10).then(console.log);
```
### Option 2: Use the API Endpoint
Make a POST request (using postman or any tool like that) to:
```bash
POST your-endpoint/api/settings/users or https://localhost:3000/api/settings/users
```
With the following JSON body:
```bash
{
  "name": "Admin",
  "email": "admin@example.com",
  "password": "$2b$10$yourHashedPasswordHere"
}
```
❗ Do not send a plain-text password. The password must already be bcrypt-hashed before sending.

---

### 🖼 Image Uploads via Cloudinary
- Admins can upload product images when creating or editing.
- Images are uploaded to Cloudinary and served via CDN.
- Products display their image on both the admin and public-facing sides.

### 💳 Payments with Paystack
- Checkout uses Paystack to collect payment.
- After successful payment, the order is recorded in the backend.
- Customers receive an email receipt and order confirmation.

### 🛒 Storefront
- Public-facing store with all available products
- Add-to-cart, checkout, and Paystack payment integration
- Order confirmation with receipt
- No user authentication needed – orders are tracked by customer input

### 📧 Email Notifications
- When an order status is updated (e.g. shipped, delivered), the customer is notified by email.
- Emails are sent via Gmail SMTP using NodeMailer and Google App Passwords.

### 📊 Analytics Dashboard
- View revenue, order counts, and top products
- Analytics are based on real-time data from delivered orders

### 🔐 Admin-Only Routes
- Admin dashboard is protected with authentication
- Admin users can manage products, discounts, inventory, shipping, and more

### 🛍️ Storefront Pages
- /store → Public-facing homepage with all products
- /store/cart → Add to cart and complete checkout via Paystack

### 📬 Order Flow Summary
- Customer adds products to cart and completes payment
- A new order is created upon successful Paystack transaction and the customer is emailed with a receipt.
- Admin updates status as the order progresses
- Customer is notified via email of each status update
