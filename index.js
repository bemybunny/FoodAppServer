const express = require('express');
const app = express();
const port = process.env.port||3000;
const mongoose = require('mongoose');
const User = require('./model/user.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

app.use(express.json());
app.use(cors());

require('dotenv').config();
mongoose.connect(process.env.DATABASE)
    .then(()=>{
        console.log('mongdb is connected')
        app.listen(port,()=>{
            console.log(`server is running at ${port}`);
        })
    })
  .catch((error)=>{
        console.log(error);
    })

const saltRounds = 10;

async function hashPassword(password){
    try{
        const salt = await bcrypt.genSalt(saltRounds);
        const hashedPassword = await bcrypt.hash(password,salt);
        return hashedPassword;
    }catch(error){
        console.log(error);
    }
}

app.post('/postData',async(req,res)=>{
    const {name,email,password} = req.body;
    try{
        const found = await User.findOne({email:email});
        if(found){
            return res.status(400).json({message:'user already exist'})
        }
        const hashedPassword = await hashPassword(password);
        
        let cart={};
        for(let i=0;i<300;i++){
            cart[i]=0;
        }
    
        const newUser =  new User({
            name:name,
            email:email,
            password: hashedPassword,
            cartData:cart,
        })
        console.log(newUser);
        await newUser.save();
        const data={
            user:{
                id:newUser._id
            }
        }
        const token = jwt.sign(data,process.env.SECRET_KEY)
        res.json({
            success:true,
            token
        })
    }catch(error){
        console.log(error);
        res.status(500);
    }
})

  

app.post('/login',async(req,res)=>{
    const {email,password}=req.body;
    try{
        const found = await User.findOne({email:email});
        if(!found){
            return res.status(400).json({message:"user not found"})
        }
        const passwordMatch = await bcrypt.compare(password,found.password);
        if(passwordMatch){
           const data = {
            user:{
                id:found._id
            }
           }
           const token = jwt.sign(data,process.env.SECRET_KEY);
           console.log(token);
           res.json({success:true,token});
        }else {
            res.status(401).json({message:'Invalid credential'})
        }
    }catch(error){
        console.log(error);
        res.status(500).json({message:"error", details: error });
    }
})

// creating middleware to fetch user

const fetchUser = async(req,res,next) => {
    const token = req.header('auth-token');
    if(!token){
        res.status(401).send({error:"please authenticate usign valid tokens"})
        
    }else{
        try{
            const data = jwt.verify(token,process.env.SECRET_KEY)
            req.user = data.user;
            console.log(data);
            next();
        }catch(error){
            res.status(401).send({errors:"please authenticate using valid token"})
        }
    }
}

//creating endpoint for adding products in cartdata

app.post('/addtocart',fetchUser,async(req,res)=>{
        console.log("Added",req.body.itemId);
        let userData = await User.findOne({_id:req.user.id})
        userData.cartData[req.body.itemId]+=1;
        await User.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
        res.send('Added')
})

app.post('/removeFromcart',fetchUser,async(req,res)=>{
    console.log("Removed",req.body.itemId);
    let userData = await User.findOne({_id:req.user.id})
    if(userData.cartData[req.body.itemId]>0)
    userData.cartData[req.body.itemId]-=1;
    await User.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send('removed')
})

app.get('/getcart', fetchUser, async (req, res) => {
    console.log('GetCart');
    try {
        let userData = await User.findOne({ _id: req.user.id });
        console.log(userData.cartData)
        res.send(userData.cartData);
       
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});