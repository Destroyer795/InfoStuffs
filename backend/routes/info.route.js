import express from 'express';
import { createInfo, deleteInfo, getInfos, updateInfo } from '../controller/info.controller.js';    // Import the controller functions for handling info operations

const router = express.Router(); // Create a new router instance    

router.get('/', getInfos); // Route to get all infos
router.post('/', createInfo); // Route to create a new info
router.patch('/:id', updateInfo); // Route to update an existing info by ID
router.delete('/:id', deleteInfo); // Route to delete an info by ID

export default router; // Export the router to use in other parts of the application
// This file defines the routes for handling information-related operations in the application.
// It uses Express.js to create a router and defines routes for getting, creating, updating, and deleting info documents.
// The router is then exported to be used in the main application file.