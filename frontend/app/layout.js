export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header>
          <h1>Game Recommender App</h1>
          <nav>
            <a href="/">Home</a> | 
            <a href="/signup">Sign Up</a> | 
            <a href="/login">Login</a> | 
            <a href="/profile">Profile</a>
          </nav>
        </header>
        <main>{children}</main>
        <footer>
          <p>© 2024 Game Recommender</p>
        </footer>
      </body>
    </html>
  );
}
