"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserById = exports.getUsers = exports.createUser = void 0;

const createUser = (req, res) => {
    res.status(200).json({ message: 'User created successfully' });
};
exports.createUser = createUser;

const getUsers = (req, res) => {
    res.status(200).json([]);
};
exports.getUsers = getUsers;

const getUserById = (req, res) => {
    const id = parseInt(req.params.id);
    res.status(200).json({ id });
};
exports.getUserById = getUserById;