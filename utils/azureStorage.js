import { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } from '@azure/storage-blob';

/**
 * Azure Blob Storage utility functions for file operations
 * Handles file uploads, downloads, and management in Azure Blob Storage
 */
export class AzureStorageService {
    constructor() {
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        if (!connectionString) {
            throw new Error('Azure Storage connection string not found');
        }
        this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        
        // Parse connection string to get account name and key
        const [accountName, accountKey] = this.parseConnectionString(connectionString);
        this.sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
        this.accountName = accountName;
    }

    /**
     * Parse connection string to get account name and key
     * @param {string} connectionString 
     * @returns {[string, string]} [accountName, accountKey]
     */
    parseConnectionString(connectionString) {
        const params = connectionString.split(';').reduce((acc, pair) => {
            const [key, value] = pair.split('=');
            acc[key] = value;
            return acc;
        }, {});

        return [
            params['AccountName'],
            params['AccountKey']
        ];
    }

    /**
     * Upload a file to Azure Blob Storage
     * @param {Buffer|Blob} file - The file to upload
     * @param {string} containerName - The container to upload to
     * @param {string} blobName - Optional custom name for the blob
     * @param {Object} metadata - Optional metadata to attach to the blob
     * @returns {Promise<{url: string, name: string, sasUrl: string}>}
     */
    async uploadFile(file, containerName, blobName = null, metadata = {}) {
        const containerClient = this.blobServiceClient.getContainerClient(containerName);
        
        // Create container if it doesn't exist
        await containerClient.createIfNotExists();

        // Generate unique blob name if not provided
        const uniqueBlobName = blobName || `${Date.now()}-${file.name}`;
        const blockBlobClient = containerClient.getBlockBlobClient(uniqueBlobName);

        // Upload file
        await blockBlobClient.uploadData(file, {
            metadata,
            blobHTTPHeaders: {
                blobContentType: metadata.contentType
            }
        });

        // Generate SAS URL
        const sasUrl = await this.generateSasUrl(containerName, uniqueBlobName);

        return {
            url: blockBlobClient.url,
            name: uniqueBlobName,
            sasUrl
        };
    }

    /**
     * Generate a SAS URL for a blob that expires in 1 hour
     * @param {string} containerName - The container name
     * @param {string} blobName - The blob name
     * @returns {Promise<string>} The SAS URL
     */
    async generateSasUrl(containerName, blobName) {
        const startsOn = new Date();
        const expiresOn = new Date(startsOn);
        expiresOn.setHours(startsOn.getHours() + 1);

        const permissions = new BlobSASPermissions();
        permissions.read = true;

        const sasOptions = {
            containerName,
            blobName,
            permissions: permissions,
            startsOn,
            expiresOn,
        };

        const sasToken = generateBlobSASQueryParameters(
            sasOptions,
            this.sharedKeyCredential
        ).toString();

        return `https://${this.accountName}.blob.core.windows.net/${containerName}/${blobName}?${sasToken}`;
    }
}
