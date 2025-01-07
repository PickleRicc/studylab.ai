import { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions, SASProtocol } from '@azure/storage-blob';

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
        console.log('Starting file upload to Azure...');
        const containerClient = this.blobServiceClient.getContainerClient(containerName);
        
        // Create container if it doesn't exist
        await containerClient.createIfNotExists();
        console.log('Container exists or was created');

        // Generate unique blob name if not provided
        const uniqueBlobName = blobName || `${Date.now()}-${file.name}`;
        console.log('Using blob name:', uniqueBlobName);
        
        const blockBlobClient = containerClient.getBlockBlobClient(uniqueBlobName);

        // Upload file
        await blockBlobClient.uploadData(file, {
            metadata,
            blobHTTPHeaders: {
                blobContentType: metadata.contentType
            }
        });
        console.log('File uploaded successfully');

        // Generate SAS URL
        const sasUrl = await this.generateSasUrl(containerName, uniqueBlobName);
        console.log('Generated SAS URL');

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
        console.log('Generating SAS URL for:', { containerName, blobName });
        
        const containerClient = this.blobServiceClient.getContainerClient(containerName);
        const blobClient = containerClient.getBlobClient(blobName);

        // Verify the blob exists and get its properties
        const exists = await blobClient.exists();
        console.log('Blob exists:', exists);
        
        if (!exists) {
            throw new Error('Blob does not exist');
        }

        // Get blob properties
        const properties = await blobClient.getProperties();
        console.log('Blob properties:', properties);

        const startsOn = new Date();
        const expiresOn = new Date(startsOn);
        expiresOn.setHours(startsOn.getHours() + 1);

        const permissions = new BlobSASPermissions();
        permissions.read = true;

        const sasOptions = {
            containerName,
            blobName,  // Use original blobName without encoding
            permissions: permissions,
            startsOn,
            expiresOn,
            contentType: properties.contentType || 'application/octet-stream',
            cacheControl: properties.cacheControl,
            contentDisposition: properties.contentDisposition || 'inline',
            protocol: SASProtocol.Https
        };

        console.log('SAS Options:', {
            ...sasOptions,
            permissions: permissions.toString(),
        });

        // Generate SAS token
        const sasToken = generateBlobSASQueryParameters(
            sasOptions,
            this.sharedKeyCredential
        ).toString();

        // Use the blobClient.url which handles encoding correctly
        const sasUrl = `${blobClient.url}?${sasToken}`;
        console.log('Generated SAS URL length:', sasUrl.length);
        
        return sasUrl;
    }

    /**
     * Download a blob directly using the Azure SDK
     * @param {string} containerName - The container name
     * @param {string} blobName - The blob name
     * @returns {Promise<Buffer>} The file content as a buffer
     */
    async downloadBlob(containerName, blobName) {
        console.log('Downloading blob:', { containerName, blobName });
        
        const containerClient = this.blobServiceClient.getContainerClient(containerName);
        const blobClient = containerClient.getBlobClient(blobName);

        // Verify the blob exists
        const exists = await blobClient.exists();
        console.log('Blob exists:', exists);
        
        if (!exists) {
            throw new Error('Blob does not exist');
        }

        // Download the blob
        const downloadResponse = await blobClient.download();
        console.log('Blob download response:', {
            contentLength: downloadResponse.contentLength,
            contentType: downloadResponse.contentType
        });

        // Read the stream
        const chunks = [];
        for await (const chunk of downloadResponse.readableStreamBody) {
            chunks.push(chunk);
        }

        // Combine chunks into a single buffer
        const buffer = Buffer.concat(chunks);
        console.log('Downloaded blob size:', buffer.length);

        return buffer;
    }
}
