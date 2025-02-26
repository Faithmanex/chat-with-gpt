import { verbose } from "sqlite3";
import { validate as validateEmailAddress } from 'email-validator';
import Database from "./index";

const sqlite3 = verbose();

const db = new sqlite3.Database('./data/chat.sqlite');

// interface ChatRow {
//     id: string;
//     user_id: string;
//     title: string;
// }

// interface MessageRow {
//     id: string;
//     user_id: string;
//     chat_id: string;
//     data: any;
// }

// interface ShareRow {
//     id: string;
//     user_id: string;
//     created_at: Date;
// }

export class SQLiteAdapter extends Database {
    public async initialize() {
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS authentication (
                id TEXT PRIMARY KEY,
                email TEXT,
                password_hash BLOB,
                salt BLOB
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS chats (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                title TEXT
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                chat_id TEXT,
                data TEXT
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS shares (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                created_at DATETIME
            )`);
        });
    }

    public createUser(email: string, passwordHash: Buffer, salt: Buffer): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!validateEmailAddress(email)) {
                reject(new Error('invalid email address'));
                return;
            }

            db.run(`INSERT INTO authentication (id, email, password_hash, salt) VALUES (?, ?, ?, ?)`, [email, email, passwordHash, salt], (err) => {
                if (err) {
                    reject(err);
                    console.log(`[database:sqlite] failed to create user ${email}`);
                } else {
                    resolve();
                    console.log(`[database:sqlite] created user ${email}`);
                }
            });
        });
    }

    public async getUser(email: string): Promise<any> {
        return new Promise((resolve, reject) => {
            db.get(`SELECT * FROM authentication WHERE email = ?`, [email], (err, row) => {
                if (err) {
                    reject(err);
                    console.log(`[database:sqlite] failed to get user ${email}`);
                } else {
                    resolve({
                        ...row,
                        passwordHash: Buffer.from(row.password_hash),
                        salt: Buffer.from(row.salt),
                    });
                    console.log(`[database:sqlite] retrieved user ${email}`);
                }
            });
        });
    }

    public async getChats(userID: string): Promise<any[]> {
        return new Promise((resolve, reject) => {
            db.all(`SELECT * FROM chats WHERE user_id = ?`, [userID], (err, rows) => {
                if (err) {
                    reject(err);
                    console.log(`[database:sqlite] failed to get chats for user ${userID}`);
                } else {
                    resolve(rows);
                    console.log(`[database:sqlite] retrieved ${rows.length} chats for user ${userID}`);
                }
            });
        });
    }

    public async getMessages(userID: string): Promise<any[]> {
        return new Promise((resolve, reject) => {
            db.all(`SELECT * FROM messages WHERE user_id = ?`, [userID], (err, rows) => {
                if (err) {
                    reject(err);
                    console.log(`[database:sqlite] failed to get messages for user ${userID}`);
                } else {
                    resolve(rows.map((row) => {
                        row.data = JSON.parse(row.data);
                        return row;
                    }));
                    console.log(`[database:sqlite] retrieved ${rows.length} messages for user ${userID}`);
                }
            });
        });
    }

    public async insertMessages(userID: string, messages: any[]): Promise<void> {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                const stmt = db.prepare(`INSERT OR IGNORE INTO messages (id, user_id, chat_id, data) VALUES (?, ?, ?, ?)`);
                messages.forEach((message) => {
                    stmt.run(message.id, userID, message.chatID, JSON.stringify(message));
                });
                stmt.finalize();
                console.log(`[database:sqlite] inserted ${messages.length} messages`);
                resolve();
            });
        });
    }

    public async createShare(userID: string|null, id: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            db.run(`INSERT INTO shares (id, user_id, created_at) VALUES (?, ?, ?)`, [id, userID, new Date()], (err) => {
                if (err) {
                    reject(err);
                    console.log(`[database:sqlite] failed to create share ${id}`);
                } else {
                    resolve(true);
                    console.log(`[database:sqlite] created share ${id}`)
                }
            });
        });
    }

    public async setTitle(userID: string, chatID: string, title: string): Promise<void> {
        return new Promise((resolve, reject) => {
            db.run(`INSERT OR IGNORE INTO chats (id, user_id, title) VALUES (?, ?, ?)`, [chatID, userID, title], (err) => {
                if (err) {
                    reject(err);
                    console.log(`[database:sqlite] failed to set title for chat ${chatID}`);
                } else {
                    resolve();
                    console.log(`[database:sqlite] set title for chat ${chatID}`)
                }
            });
        });
    }
}