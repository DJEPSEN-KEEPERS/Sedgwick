"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const storage_blob_1 = require("@azure/storage-blob");
const prisma_1 = require("../../lib/prisma");
const authMiddleware_1 = require("../../middleware/authMiddleware");
async function getSignedUrlHandler(req, context) {
    try {
        const jwtUser = (0, authMiddleware_1.authenticate)(req);
        const { fileId } = req.params;
        const file = await prisma_1.prisma.projectAttachment.findUnique({
            where: { id: fileId },
            include: { project: true },
        });
        if (!file)
            return { status: 404, jsonBody: { error: 'Fil ikke fundet' } };
        if (jwtUser.role === 'INSURER_USER') {
            if (file.project.insuranceCompanyId !== jwtUser.linkedEntityId || !file.isClientVisible) {
                return { status: 403, jsonBody: { error: 'Ingen adgang' } };
            }
        }
        const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
        const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
        const containerName = process.env.AZURE_STORAGE_CONTAINER ?? 'sedgwick-files';
        // Extract blob name from the stored blobUrl path
        const blobUrlObj = new URL(file.blobUrl);
        const blobName = blobUrlObj.pathname.replace(`/${containerName}/`, '');
        const sharedKeyCredential = new storage_blob_1.StorageSharedKeyCredential(accountName, accountKey);
        const expiresOn = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        const sasToken = (0, storage_blob_1.generateBlobSASQueryParameters)({
            containerName,
            blobName,
            permissions: storage_blob_1.BlobSASPermissions.parse('r'),
            expiresOn,
        }, sharedKeyCredential).toString();
        const signedUrl = `${file.blobUrl}?${sasToken}`;
        return { status: 200, jsonBody: { url: signedUrl, expiresAt: expiresOn.toISOString() } };
    }
    catch (err) {
        return (0, authMiddleware_1.errorResponse)(err, context);
    }
}
functions_1.app.http('files-get-signed-url', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'files/{fileId}/signed-url',
    handler: getSignedUrlHandler,
});
