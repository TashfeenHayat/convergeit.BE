const User = require("../models/userModel");
const generteTokenAndSetCookie = require("../utils/helpers/generateTokenAndSetCookies");
const { getClearAuthCookieOptions } = require("../utils/helpers/cookieOptions");
const bCrypt = require("bcryptjs");
const cookie = require ("cookie-parser");
const validateResult = require("../utils/validators/validateResult");
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');


const SignInUser = async (req, res) => {
    // validateResult(req, res);

    let {email, password} = req.body;
    email = email.toLowerCase();

    try {
        
        const user = await User.findOne({email});
    if(!user){
        res.status(400).json({error: "Email not found"});
        return;
    }
    if(user.accountStatus === "suspended") {
        res.status(400).json({error: "Your account is in suspended state. Please contact Admin"});
        return;
    }

    if(user.accountStatus === "suspended") {
           return res.status(400).json({error: "Your account is in suspended state. Please contact Admin"});
    }

    const isPassswordValid = await bCrypt.compare(password, user.password || "");

    // Checks the account suspension and increments failed attempts in case password is correct
    if(!isPassswordValid) {
        if(user.failedAttempts < 3) {
            user.failedAttempts++;
            await user.save();
            res.status(400).json({error: "Password is incorrect"}); 
            return;
        }
        else{
            user.accountStatus = "suspended"
            await user.save();
            res.status(400).json({error: "Your account is in suspended state. Please contact Admin"});
            return;
        }
        
    }

    const token = generteTokenAndSetCookie(user._id, res);
        user.failedAttempts = 0; //refresh the failed attempts in case user provides the correct password
        await user.save();

        user.password = null;
        res.status(200).json({ ...user.toJSON(), token });
    } catch (error) {
        res.status(500).send(error.message);
        console.log("Error in login", error.message)
    }
}

const createUser = async (req, res) => {
    try {
        const { name, password, userType, phone, mobile, companyIds } = req.body;
        let { profilePic } = req.body;
        let { email } = req.body;
        email = email.toLowerCase();
        const userExsist = await User.findOne({ email });

        if (userExsist) {
            res.status(400).json({ message: "Email already registered. Please LogIn or contact admin for assistance" });
            return;
        }

        if (profilePic) {
            const uploadedResponse = await cloudinary.uploader.upload(profilePic);
            profilePic = uploadedResponse.secure_url;
        }

      let  parsedCompanyIds = JSON.parse(companyIds).map(id => new mongoose.Types.ObjectId(id));

        // Ensure companyIds are in ObjectId format
        // const parsedCompanyIds = Array.isArray(companyIds) ? companyIds.map(id => mongoose.Types.ObjectId(id)) : [];

        console.log('parsedCompanyIds',parsedCompanyIds)
        const userCreated = await User.create({ name, email, password, userType, profilePic, phone, mobile, companies: parsedCompanyIds });
        res.status(201).json({ message: "User Created Successfully", userId: userCreated._id.toString() });
        console.log(userCreated);

    } catch (error) {
        res.status(500).send(error.message);
        console.log("Error in createUser", error.message)
    }
};

const logoutUser = async (req, res) => {
    try {
        res.cookie("jwt", "", getClearAuthCookieOptions());
        return  res.status(200).json({message: "User logged out successfully"})
        
    } catch (error) {
        res.status(500).send(error.message);
        console.log("Error in logoutUser", error.message)
    }
}

const updateUser = async (req, res) => {
    const { name, username, phone, mobile } = req.body;
    const userId = req.params.id;

    try {
        let user = await User.findById(userId);
        if (!user) {
            return res.status(400).json({ error: "User not found" });
        }

        let profilePic = user.profilePic;
        if (req.file) {
            if (user.profilePic) {
                await cloudinary.uploader.destroy(user.profilePic.split("/").pop().split(".")[0]);
            }
            const uploadedResponse = await cloudinary.uploader.upload(req.file.path);
            profilePic = uploadedResponse.secure_url;
        }

        user.name = name || user.name;
        user.username = username || user.username;
        user.profilePic = profilePic || user.profilePic;
        user.phone = phone || user.phone;
        user.mobile = mobile || user.mobile;

        if (req.body.companyIds) {
            user.companies = JSON.parse(req.body.companyIds).map(id => new mongoose.Types.ObjectId(id));
        }

        user = await user.save();
        user.password = null;

        res.status(200).json(user);
    } catch (error) {
        res.status(500).send(error.message);
    }
};

const getAllUsers = async (req, res) => {
    const { page = 1, limit = 10, search = '' } = req.query;
    try {
        const searchQuery = search
            ? {
                  $or: [
                      { name: { $regex: search, $options: 'i' } },
                      { email: { $regex: search, $options: 'i' } },
                      { phone: { $regex: search, $options: 'i' } }
                  ]
              }
            : {};

        const users = await User.find(searchQuery)
            .populate('companies', 'name')
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const totalUsers = await User.countDocuments(searchQuery);
        res.status(200).json({ users, totalUsers, totalPages: Math.ceil(totalUsers / limit), currentPage: Number(page) });
    } catch (error) {
        res.status(500).send(error.message);
    }
};

const updateUserStatus = async (req, res) => {
    const { id } = req.params;
    const { accountStatus } = req.body;

    try {
        let user = await User.findById(id);
        if (!user) {
            return res.status(400).json({ error: "User not found" });
        }
   console.log(user)
   console.log(accountStatus)
        user.accountStatus = accountStatus;
        user = await user.save();

        res.status(200).json(user);
    } catch (error) {
        res.status(500).send(error.message);
    }
};


const getUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId).populate('companies'); // Assuming you have a companies field that references companies

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json(user);
    } catch (error) {
        res.status(500).send(error.message);
        console.log("Error in getUser", error.message);
    }
};




const getUserCounts = async (req, res) => {
    try {
        const users = await User.countDocuments({ userType: 'client' });
        const admins = await User.countDocuments({ userType: 'admin' });
        const employees = await User.countDocuments({ userType: 'employee' });
        const clients = await User.countDocuments({ userType: 'client' });

        const totalUsers = users + admins + employees + clients;

        res.json({ users, admins, employees, clients, totalUsers });
    } catch (error) {
        res.status(500).send(error.message);
    }
};

const getUserStatus = async (req, res) => {
    try {
        const active = await User.countDocuments({ accountStatus: 'active' });
        const suspended = await User.countDocuments({ accountStatus: 'suspended' });
        const blocked = await User.countDocuments({ accountStatus: 'blocked' });
        const inactive = await User.countDocuments({ accountStatus: 'inactive' });

        const totalUsers = active + suspended + blocked + inactive;

        res.json({ active, suspended, blocked, inactive, totalUsers });
    } catch (error) {
        res.status(500).send(error.message);
    }
};




module.exports = {SignInUser, createUser, logoutUser, updateUser,getAllUsers,updateUserStatus,getUser,getUserCounts,getUserStatus};