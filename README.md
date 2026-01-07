<div align="center">
  <h1 align="center">Notes - A Modern Note-Taking Web App</h1>
  <p align="center">
    Capture your thoughts, ideas, and tasks with a fast, secure, and feature-rich note-taking application.
    <br />
    <a href="https://github.com/bornebyte/notes"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://notes.shubham-shah.com.np/">View Demo</a>
    ·
    <a href="https://github.com/bornebyte/notes/issues">Report Bug</a>
    ·
    <a href="https://github.com/bornebyte/notes/issues">Request Feature</a>
  </p>
</div>

---

## About The Project

**Notes** is a full-stack web application designed for efficient and organized note-taking. Built with the latest web technologies, it provides a seamless user experience for creating, managing, and sharing notes. The application features a clean, modern interface with a powerful backend to keep your data safe and accessible.

From a quick memo to detailed notes with formatting, Notes is your personal digital notebook.

### Key Features

*   **📝 Create & Update Notes**: An intuitive dialog-based interface for adding and editing notes.
*   **✍️ Simple Markdown Support**: Format your notes with **Bold**, *Italic*, __Underline__, and bulleted lists.
*   **🗂️ Note Management**:
    *   **Favorites**: Mark important notes for quick access.
    *   **Trash**: Move notes to the trash instead of permanently deleting them, with an option to restore.
*   **🔗 Shareable Notes**: Generate unique, secure links to share your notes with others.
*   **📊 Admin Dashboard**: Visualize your note-taking activity with a monthly breakdown chart and see total note counts.
*   **🔔 Notifications**: Get notified about activities like creating, updating, or sharing notes.
*   **🔐 Secure**: User authentication and password management features.
*   **📱 Responsive Design**: A collapsible sidebar and mobile-friendly layout for a great experience on any device.

### Built With

This project leverages a modern, full-stack JavaScript ecosystem.

*   **Next.js** - The React Framework for the Web
*   **React** - Frontend library
*   **Tailwind CSS** - Utility-first CSS framework
*   **shadcn/ui** - Re-usable components built using Radix UI and Tailwind CSS
*   **Neon** - Serverless Postgres database
*   **Vercel** - Deployment and hosting

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

Make sure you have Node.js and npm (or yarn/pnpm/bun) installed on your machine.

*   npm
    ```sh
    npm install npm@latest -g
    ```

### Installation

1.  **Clone the repo**
    ```sh
    git clone https://github.com/bornebyte/notes.git
    cd notes
    ```

2.  **Install NPM packages**
    ```sh
    npm install --legacy-peer-deps
    ```

3.  **Set up environment variables**

    Create a `.env.local` file in the root of your project and add your database connection string. You can copy the example file:
    ```sh
    cp .env.example .env.local
    ```
    Then, edit `.env.local` with your credentials:
    ```
    DATABASE_URL="your_neon_database_connection_string"
    SESSION_SECRET="your_session_secret_here"
    ```

### Running the Application

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
