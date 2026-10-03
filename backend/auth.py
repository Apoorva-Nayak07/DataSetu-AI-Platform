"""Minimal token auth: PBKDF2 password hashes, opaque bearer tokens, guest sessions."""
import hashlib, os, secrets


def hash_pw(pw, salt=None):
    salt = salt or os.urandom(16).hex()
    return salt + "$" + hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt), 120_000).hex()


def check_pw(pw, stored):
    salt, h = stored.split("$")
    return secrets.compare_digest(hash_pw(pw, salt).split("$")[1], h)


def issue(c, username):
    t = secrets.token_urlsafe(32)
    c.execute("INSERT INTO tokens(token, username) VALUES (?,?)", (t, username)); c.commit()
    return {"token": t, "username": username}


def register(c, username, pw):
    username = (username or "").strip()
    if not (3 <= len(username) <= 32) or not username.replace("_", "").replace("-", "").isalnum(): raise ValueError("Username must be 3-32 letters, digits, - or _.")
    if len(pw or "") < 8: raise ValueError("Password must be at least 8 characters.")
    if c.execute("SELECT 1 FROM users WHERE username=?", (username,)).fetchone(): raise ValueError("That username is taken.")
    c.execute("INSERT INTO users(username, pw) VALUES (?,?)", (username, hash_pw(pw))); c.commit()
    return issue(c, username)


def login(c, username, pw):
    row = c.execute("SELECT pw FROM users WHERE username=?", ((username or "").strip(),)).fetchone()
    if not row or not check_pw(pw or "", row[0]): raise ValueError("Wrong username or password.")
    return issue(c, username.strip())


def guest(c): return issue(c, "guest-" + secrets.token_hex(3))


def user_for(c, token):
    r = c.execute("SELECT username FROM tokens WHERE token=?", (token,)).fetchone()
    return r[0] if r else None
