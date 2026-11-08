import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationFiles = [
    "migrations/20261108_add_mcp.sql",
    "migrations/20261108_add_mcp_grant_expiry.sql",
];

function splitStatements(source) {
    const statements = [];
    let current = "";
    let hasSql = false;
    let quote = null;
    let lineComment = false;
    let blockCommentDepth = 0;
    let dollarQuote = null;

    for (let index = 0; index < source.length; index += 1) {
        const char = source[index];
        const next = source[index + 1];

        if (lineComment) {
            current += char;
            if (char === "\n") lineComment = false;
            continue;
        }

        if (blockCommentDepth > 0) {
            if (char === "/" && next === "*") {
                current += "/*";
                blockCommentDepth += 1;
                index += 1;
            } else if (char === "*" && next === "/") {
                current += "*/";
                blockCommentDepth -= 1;
                index += 1;
            } else {
                current += char;
            }
            continue;
        }

        if (dollarQuote) {
            if (source.startsWith(dollarQuote, index)) {
                current += dollarQuote;
                index += dollarQuote.length - 1;
                dollarQuote = null;
            } else {
                current += char;
            }
            continue;
        }

        if (quote) {
            current += char;
            if (char === quote && next === quote) {
                current += next;
                index += 1;
            } else if (char === quote) {
                quote = null;
            }
            continue;
        }

        if (char === "-" && next === "-") {
            current += "--";
            lineComment = true;
            index += 1;
            continue;
        }
        if (char === "/" && next === "*") {
            current += "/*";
            blockCommentDepth = 1;
            index += 1;
            continue;
        }
        if (char === "'" || char === '"') {
            quote = char;
            hasSql = true;
            current += char;
            continue;
        }
        if (char === "$") {
            const match = source.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
            if (match) {
                dollarQuote = match[0];
                hasSql = true;
                current += dollarQuote;
                index += dollarQuote.length - 1;
                continue;
            }
        }
        if (char === ";") {
            if (hasSql) statements.push(current.trim());
            current = "";
            hasSql = false;
            continue;
        }

        if (!/\s/.test(char)) hasSql = true;
        current += char;
    }

    if (hasSql) statements.push(current.trim());
    return statements;
}

async function applyFile(database, relativePath) {
    const absolutePath = path.join(projectRoot, relativePath);
    const source = await readFile(absolutePath, "utf8");
    const statements = splitStatements(source);

    for (const statement of statements) {
        // These are trusted, checked-in schema files; no runtime or user input is interpolated.
        await database.query(statement);
    }

    console.log(`Applied ${relativePath} (${statements.length} statements).`);
}

async function main() {
    const action = process.argv[2];
    if (!["init", "migrate"].includes(action) || process.argv.length > 3) {
        console.error("Usage: pnpm db:init | pnpm db:migrate");
        process.exitCode = 1;
        return;
    }
    if (!process.env.DATABASE_URL) {
        console.error("DATABASE_URL is required. Set it in .env.local before running this command.");
        process.exitCode = 1;
        return;
    }

    const database = neon(process.env.DATABASE_URL, {
        fetchOptions: { timeout: 30000 },
    });
    const files = action === "init" ? ["schema.sql", ...migrationFiles] : migrationFiles;

    for (const file of files) {
        try {
            await applyFile(database, file);
        } catch (error) {
            const code = typeof error?.code === "string" && /^[A-Z0-9_-]{1,16}$/.test(error.code)
                ? ` (error code ${error.code})`
                : "";
            console.error(`Could not apply ${file}${code}. Check DATABASE_URL and database permissions; query text and credentials were suppressed.`);
            process.exitCode = 1;
            return;
        }
    }
}

main().catch(() => {
    console.error("Database setup failed. Check DATABASE_URL and the database connection.");
    process.exitCode = 1;
});
