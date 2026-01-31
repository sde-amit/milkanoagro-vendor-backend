const crypto = require('crypto');

class Helpers {
    static generateRandomString(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    static formatPhoneNumber(phone) {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10) {
            return `+91${cleaned}`;
        } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
            return `+${cleaned}`;
        }
        return phone;
    }

    static cleanPhoneNumber(phone) {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.startsWith('91') && cleaned.length === 12) {
            return cleaned.substring(2);
        }
        return cleaned;
    }

    static validateGSTIN(gstin) {
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        return gstinRegex.test(gstin);
    }

    static validateIFSC(ifsc) {
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        return ifscRegex.test(ifsc);
    }

    static validatePAN(pan) {
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        return panRegex.test(pan);
    }

    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static generateUniqueFileName(originalName) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        const extension = originalName.split('.').pop();
        const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
        return `${nameWithoutExt}-${timestamp}-${random}.${extension}`;
    }

    static sanitizeFileName(filename) {
        return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    }

    static isValidJSON(str) {
        try {
            JSON.parse(str);
            return true;
        } catch (e) {
            return false;
        }
    }

    static deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    static removeSensitiveData(obj, sensitiveFields = ['password', 'otp', 'token']) {
        const cleaned = this.deepClone(obj);

        const removeSensitive = (item) => {
            if (Array.isArray(item)) {
                return item.map(removeSensitive);
            } else if (item && typeof item === 'object') {
                const cleanedItem = {};
                for (const [key, value] of Object.entries(item)) {
                    if (!sensitiveFields.includes(key.toLowerCase())) {
                        cleanedItem[key] = removeSensitive(value);
                    } else {
                        cleanedItem[key] = '[REDACTED]';
                    }
                }
                return cleanedItem;
            }
            return item;
        };

        return removeSensitive(cleaned);
    }

    static generatePaginationMeta(page, limit, total) {
        const totalPages = Math.ceil(total / limit);
        return {
            page: parseInt(page),
            limit: parseInt(limit),
            total: parseInt(total),
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
            nextPage: page < totalPages ? page + 1 : null,
            prevPage: page > 1 ? page - 1 : null
        };
    }

    static formatDateForMySQL(date = new Date()) {
        return date.toISOString().slice(0, 19).replace('T', ' ');
    }

    static calculateAge(birthDate) {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }

        return age;
    }

    static generateOTP(length = 6) {
        const digits = '0123456789';
        let otp = '';
        for (let i = 0; i < length; i++) {
            otp += digits[Math.floor(Math.random() * 10)];
        }
        return otp;
    }

    static maskPhone(phone) {
        if (!phone || phone.length < 4) return phone;
        const cleaned = this.cleanPhoneNumber(phone);
        return cleaned.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2');
    }

    static maskEmail(email) {
        if (!email || !email.includes('@')) return email;
        const [username, domain] = email.split('@');
        const maskedUsername = username.length > 2
            ? username.substring(0, 2) + '*'.repeat(username.length - 2)
            : username;
        return `${maskedUsername}@${domain}`;
    }

    static validatePincode(pincode) {
        const pincodeRegex = /^[1-9][0-9]{5}$/;
        return pincodeRegex.test(pincode);
    }

    static getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    static isImageFile(filename) {
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
        const extension = this.getFileExtension(filename);
        return imageExtensions.includes(extension);
    }

    static isDocumentFile(filename) {
        const docExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'];
        const extension = this.getFileExtension(filename);
        return docExtensions.includes(extension);
    }

    static generateSlug(str) {
        return str
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    static capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    static toTitleCase(str) {
        return str.replace(/\w\S*/g, (txt) =>
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    }

    static isEmpty(value) {
        return value === null ||
            value === undefined ||
            value === '' ||
            (Array.isArray(value) && value.length === 0) ||
            (typeof value === 'object' && Object.keys(value).length === 0);
    }

    static async retry(fn, maxRetries = 3, delay = 1000) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                if (i === maxRetries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
            }
        }
    }
}

module.exports = Helpers;