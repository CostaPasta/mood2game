export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header>
          <h1>Game Recommender App</h1>
        </header>
        <main>{children}</main>
        <footer>
          <p>© 2024 Game Recommender</p>
        </footer>
      </body>
    </html>
  );
}
