import { DatabaseSync } from 'node:sqlite'

const path = process.argv[2]
if (!path) throw new Error('Database path required')
const db = new DatabaseSync(path)
db.exec(`
  CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "duration" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "provider" TEXT,
    "externalId" TEXT
  );
  CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");
`)
const insert = db.prepare('INSERT INTO Subscription (id,userId,plan,active,expiresAt) VALUES (?,?,?,?,?)')
insert.run('legacy_future','u1','oasis',1,new Date(Date.now()+86400000).toISOString())
insert.run('legacy_past','u2','wellness',1,new Date(Date.now()-86400000).toISOString())
insert.run('legacy_inactive','u3','decouverte',0,null)
db.close()
