# Cookie Jar 🍪

Cookie Jar is a tool designed to maintain active sessions by periodically refreshing cookies. It's perfect for developers and security researchers who need to keep multiple sessions alive simultaneously.

## 🚀 Features

- Automated cookie management
- Concurrent session handling
- Scalable architecture using MongoDB
- Configurable refresh intervals

## 🛠️ Technologies Used

- Node.js
- TypeScript
- Express.js
- MongoDB
- Puppeteer
- Toad Scheduler

## 🏗️ Project Structure

- `src/index.ts`: Main server file
- `src/mongodb.ts`: MongoDB connection handler
- `src/puppeteer.ts`: Puppeteer session management
- `examples/chrome`: Example Chrome extension (see below)

## 🚀 Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up your `.env` file. See `.env.template`
4. Build the project: `npm run build`
5. Start the server: `npm start`

## 🔧 Configuration

Create a `.env` file in the root directory with the following variables:

## 📚 Examples

### Chrome Extension
> **Warning**
>
> This example is provided strictly for educational and testing purposes. It demonstrates techniques that could be misused if implemented incorrectly or with malicious intent. Always ensure you have proper authorization before accessing or manipulating cookies, and respect user privacy and website terms of service.

The `examples/chrome` directory contains a sample Chrome extension that demonstrates how to interact with the Cookie Jar system. This extension serves as an educational tool to understand the mechanics of cookie management and session handling. 

Key features of the Chrome extension example:

- Connects to a remote Chrome instance for debugging
- Retrieves all cookies from the active session
- Sends collected cookies to Cookie Jar