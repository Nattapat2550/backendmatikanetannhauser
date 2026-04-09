const User = require('../models/User');

exports.login = async (req, res, next) => {
    try {
        const {email, password} = req.body;
        
        if(!email || !password){
            return res.status(400).json({
                sucess: false,
                msg: 'Please provide an email and password',
            });
        }
        
        const user = await User.findOne({email}).select('+password');

        if(!user){
            return res.status(400).json({
                sucess: false,
                msg: 'Invalid Credentials',
            });
        }
    
        const isMatch = await user.matchPassword(password);
    
        if(!isMatch){
            return res.status(401).json({
                sucess: false,
                msg: 'Please provide an email and password',
            });
        }
    
        sendTokenResponse(user, 200, res);
    } catch (error) {
        return res.status(401).json({
            success: false,
            msg: "Cannot convert email or password to string",
        });
    }
};

exports.register = async (req, res, next) => {
    try{
        const {name, email, password, telephone, role} = req.body;

        const existdEmail = await User.findOne({email});
        const existdTelephone = await User.findOne({telephone});

        if(existdEmail){
            return res.status(400).json({
                success: false,
                message: "This email is already existed",
            });
        }

        if(existdTelephone){
            return res.status(400).json({
                success: false,
                message: "This telephone number is already existed",
            });
        }

        const user = await User.create({
            name,
            email,
            password,
            telephone,
            role
        });

        sendTokenResponse(user, 200, res);
        
    }catch(err){
        res.status(400).json({success: false});
        console.error(err.stack);
    }
};

const sendTokenResponse = (user, statusCode, res) => {
    const token = user.getSignedJwtToken();
    
    const options = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
        httpOnly: true,
    };
    
    if(process.env.NODE_ENV === 'production'){
        options.secure = true;
    }
    
    res.status(statusCode).cookie('token', token, options).json({
        success: true,
        token
    });
};

exports.getMe = async (req, res, next) => {
    const user = await User.findById(req.user.id);
    res.status(200).json({
        success: true,
        data: user,
    });
};

exports.getAll = async (req, res, next) => {
    const users = await User.find();
    res.status(200).json({
        success: true,
        data: users,
    })
}

exports.logout = async (req, res, next) => {
    res.cookie('token', 'none', {
        expires : new Date(Date.now() + 10 * 1000),
        httpOnly: true,
    });

    res.status(200).json({
        success: true,
        data: {},
    });
};