## VLC End points for the api

### Axios is best for handling api status codes

Use the steps to install axios

```bash
    npm install --save axios
```

Import and use axios

```javascript
//add this dependency for api fetch
import axios from "axios";

await axios.fetch();
```

## About the Endpoints and Data To Pass

---

- ### _To register a new user_

```json
{
  "phoneNumber": "+23312345678", //should match a format (+233) and number without zero (123456789)
  "password": "qwerty" // should be 8 charcters long
}
```

send a **POST** to the end point

```http
    http://_____/register
```

**Responses:**
*   **Success (200 OK):**
    ```json
    {
        "status": true,
        "message": "User registered successfully",
        "data": {
            "id": "uuid-generated-string",
            "phoneNumber": "+23312345678",
            "password": "hashed-password",
            "createdAt": "2025-07-14T12:00:00"
        }
    }
    ```
*   **Error (400 Bad Request):**
    ```json
    {
        "status": false,
        "message": "Phone number already exists",
        "data": null
    }
    ```
    Or for validation errors:
    ```json
    {
        "status": false,
        "message": "Validation error message (e.g., 'Phone number must not be null')",
        "data": null
    }
    ```

- ### _To reset a user's password_

```json
{
  "phoneNumber": "+23312345678", //should match a format (+233) and number without zero (123456789)
  "password": "new password" // should be 8 charcters long
}
```

send a **POST** to the end point

```http
    http://_____/reset-password
```

**Responses:**
*   **Success (200 OK):**
    ```json
    {
        "status": true,
        "message": "Password reset successfully",
        "data": "success"
    }
    ```
*   **Error (400 Bad Request):**
    ```json
    {
        "status": false,
        "message": "Bad request message (e.g., 'User not found')",
        "data": null
    }
    ```
    Or for validation errors:
    ```json
    {
        "status": false,
        "message": "Validation error message (e.g., 'Password must be at least 8 characters long')",
        "data": null
    }
    ```
*   **Error (404 Not Found):**
    ```json
    {
        "status": false,
        "message": "Phone number doesn't exists",
        "data": null
    }
    ```
*   **Error (500 Internal Server Error):**
    ```json
    {
        "status": false,
        "message": "Error message (e.g., 'An unexpected error occurred')",
        "data": null
    }
    ```

- ### _Logining in_

```json
{
  "phoneNumber": "+23312345678", //should match a format (+233) and number without zero (123456789)
  "password": "new password" // should be 8 charcters long
}
```

send a **POST** to the end point

```http
    http://_____/login
```

**Responses:**
*   **Success (200 OK):**
    ```json
    {
        "status": true,
        "message": "User authenticated successfully",
        "data": {
            "jwt": "a set of strings to be stored as jwt"
        }
    }
    ```
*   **Error (400 Bad Request):**
    ```json
    {
        "status": false,
        "message": "Validation error message (e.g., 'Phone number must not be null')",
        "data": null
    }
    ```
*   **Error (401 Unauthorized):**
    ```json
    {
        "status": false,
        "message": "Invalid credentials, please try again",
        "data": null
    }
    ```
*   **Error (404 Not Found):**
    ```json
    {
        "status": false,
        "message": "Phone number doesn't exists",
        "data": null
    }
    ```
*   **Error (500 Internal Server Error):**
    ```json
    {
        "status": false,
        "message": "Error message (e.g., 'An unexpected error occurred')",
        "data": null
    }
    ```

- ### _To log a user out_

send a **GET** to the end point

```http
    http://_____/logout
```

**Headers:**
*   `Authorization: Bearer <JWT_TOKEN>`

**Responses:**
*   **Success (200 OK):**
    ```json
    {
        "status": true,
        "message": "User logged out successfully",
        "data": "Logout successful"
    }
    ```
*   **Error (400 Bad Request):**
    ```json
    {
        "status": false,
        "message": "No token provided",
        "data": null
    }
    ```

---

### Profile Endpoints

- ### _Get User Profile_

send a **GET** to the end point

```http
    http://_____/profile
```

**Headers:**
*   `Authorization: Bearer <JWT_TOKEN>`

**Responses:**
*   **Success (200 OK):**
    ```json
    {
        "status": true,
        "message": "User profile retrieved successfully",
        "data": {
            "id": "user-id",
            "phoneNumber": "+23312345678",
            "username": "user-username",
            "storageUsed": 1024.5,
            "profilePicture": "url-to-profile-picture",
            "createdAt": "2025-07-14T12:00:00",
            "updatedAt": "2025-07-14T13:00:00"
        }
    }
    ```
*   **Error (500 Internal Server Error):**
    ```json
    {
        "status": false,
        "message": "Failed to retrieve user profile: Error message",
        "data": null
    }
    ```
    (e.g., "User not authenticated.", "User not found for authenticated ID.", "Profile not found for user ID.")

- ### _Update User Profile_

send a **POST** to the end point

```http
    http://_____/profile/update
```

**Headers:**
*   `Authorization: Bearer <JWT_TOKEN>`
*   `Content-Type: multipart/form-data`

**Request Parts:**
*   `metadata` (Optional): JSON object as `UpdateProfileDTO`
    ```json
    {
      "username": "newUsername"
    }
    ```
*   `file` (Optional): `MultipartFile` for `profileImage`

**Responses:**
*   **Success (200 OK):**
    ```json
    {
        "status": true,
        "message": "Profile updated successfully",
        "data": "Profile updated successfully"
    }
    ```
*   **Error (400 Bad Request):**
    ```json
    {
        "status": false,
        "message": "Failed to update Profile",
        "data": null
    }
    ```
*   **Error (500 Internal Server Error):**
    ```json
    {
        "status": false,
        "message": "Failed to update Profile: Error message",
        "data": null
    }
    ```
    (e.g., "User not authenticated.", "Profile not found for user ID: <userId>", "Failed to upload profile image to Cloudinary.")

---

### Storage Endpoints

- ### _Get All Storage Information_

send a **GET** to the end point

```http
    http://_____/storage
```

**Headers:**
*   `Authorization: Bearer <JWT_TOKEN>`

**Responses:**
*   **Success (200 OK):**
    ```json
    {
        "status": true,
        "message": "Storage information retrieved successfully.",
        "data": [
            {
                "id": "storage-id-1",
                "userId": "user-id",
                "fileName": "file1.mp4",
                "size": 1024.0,
                "fileType": "video/mp4",
                "storageLocation": "url-to-file1",
                "createdAt": "2025-07-14T12:00:00",
                "description": "Description for file1"
            },
            {
                "id": "storage-id-2",
                "userId": "user-id",
                "fileName": "image.jpg",
                "size": 512.0,
                "fileType": "image/jpeg",
                "storageLocation": "url-to-image",
                "createdAt": "2025-07-14T12:05:00",
                "description": "Description for image"
            }
        ]
    }
    ```
*   **Error (404 Not Found):**
    ```json
    {
        "status": false,
        "message": "No storage information found.",
        "data": null
    }
    ```
*   **Error (500 Internal Server Error):**
    ```json
    {
        "status": false,
        "message": "An error occurred while retrieving storage information: Error message",
        "data": null
    }
    ```
    (e.g., "User not authenticated.")

- ### _Get Storage Information by ID_

send a **GET** to the end point

```http
    http://_____/storage/{id}
```

**Headers:**
*   `Authorization: Bearer <JWT_TOKEN>`

**Path Variables:**
*   `id` (String): The ID of the storage item.

**Responses:**
*   **Success (200 OK):**
    ```json
    {
        "status": true,
        "message": "Storage information retrieved successfully.",
        "data": {
            "id": "storage-id",
            "userId": "user-id",
            "fileName": "file.mp4",
            "size": 1024.0,
            "fileType": "video/mp4",
            "storageLocation": "url-to-file",
            "createdAt": "2025-07-14T12:00:00",
            "description": "Description for file"
        }
    }
    ```
*   **Error (404 Not Found):**
    ```json
    {
        "status": false,
        "message": "No storage information found.",
        "data": null
    }
    ```
*   **Error (500 Internal Server Error):**
    ```json
    {
        "status": false,
        "message": "An error occurred while retrieving storage information: Error message",
        "data": null
    }
    ```
    (e.g., "User not authenticated.", "Storage data not found with ID: <id>")

- ### _Add Storage Information (File Upload)_

send a **POST** to the end point

```http
    http://_____/storage/add
```

**Headers:**
*   `Authorization: Bearer <JWT_TOKEN>`
*   `Content-Type: multipart/form-data`

**Request Parts:**
*   `metadata`: JSON object as `FileUploadDTO`
    ```json
    {
      "fileName": "optionalFileName.mp4",
      "fileType": "optional/type",
      "description": "optional description"
    }
    ```
*   `file`: `MultipartFile` (the actual file to upload)
*   `sessionId`: String (WebSocket session ID for progress updates)

**Responses:**
*   **Success (200 OK):**
    ```json
    {
        "status": true,
        "message": "Storage information added successfully.",
        "data": "success"
    }
    ```
*   **Error (400 Bad Request):**
    ```json
    {
        "status": false,
        "message": "File upload failed: Error message",
        "data": null
    }
    ```
    (e.g., "File is empty or not provided.", "File upload failed in service.")
*   **Error (500 Internal Server Error):**
    ```json
    {
        "status": false,
        "message": "Error processing file: Error message",
        "data": null
    }
    ```
    (e.g., "An unexpected error occurred during file upload: Error message", "User not authenticated.", "User profile not found.", "Failed to upload file to cloud storage.")

- ### _Delete Storage Information_

send a **DELETE** to the end point

```http
    http://_____/storage/{id}
```

**Headers:**
*   `Authorization: Bearer <JWT_TOKEN>`

**Path Variables:**
*   `id` (String): The ID of the storage item to delete.

**Responses:**
*   **Success (200 OK):**
    ```json
    {
        "status": true,
        "message": "Storage information deleted successfully.",
        "data": null
    }
    ```
*   **Error (500 Internal Server Error):**
    ```json
    {
        "status": false,
        "message": "An error occurred while deleting storage information: Error message",
        "data": null
    }
    ```
    (e.g., "Storage data not found with ID: <id>", "Failed to delete file from cloud storage.")