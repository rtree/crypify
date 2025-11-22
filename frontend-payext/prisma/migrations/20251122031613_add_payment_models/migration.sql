-- CreateTable
CREATE TABLE "PaymentSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "gid" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "test" BOOLEAN NOT NULL DEFAULT false,
    "kind" TEXT,
    "customerEmail" TEXT,
    "customerLocale" TEXT,
    "proposedAt" TEXT,
    "cancelUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentMethod" TEXT,
    "rawData" TEXT NOT NULL,
    "walletAddress" TEXT,
    "transactionHash" TEXT,
    "blockNumber" TEXT,
    "confirmationResult" BOOLEAN,
    "confirmationReceivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RefundSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "gid" TEXT NOT NULL,
    "paymentSessionId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "proposedAt" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rawData" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RefundSession_paymentSessionId_fkey" FOREIGN KEY ("paymentSessionId") REFERENCES "PaymentSession" ("sessionId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CaptureSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "gid" TEXT NOT NULL,
    "paymentSessionId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "proposedAt" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rawData" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CaptureSession_paymentSessionId_fkey" FOREIGN KEY ("paymentSessionId") REFERENCES "PaymentSession" ("sessionId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VoidSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "gid" TEXT NOT NULL,
    "paymentSessionId" TEXT NOT NULL,
    "proposedAt" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rawData" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VoidSession_paymentSessionId_fkey" FOREIGN KEY ("paymentSessionId") REFERENCES "PaymentSession" ("sessionId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentSession_sessionId_key" ON "PaymentSession"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "RefundSession_sessionId_key" ON "RefundSession"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "CaptureSession_sessionId_key" ON "CaptureSession"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "VoidSession_sessionId_key" ON "VoidSession"("sessionId");
