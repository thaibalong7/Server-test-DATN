const db = require('../models');
const users = db.users;
const bcrypt = require('bcrypt-nodejs');
const fs = require('fs');
const jwt = require('jsonwebtoken');

// use 'utf8' to get string instead of byte array  (512 bit key)
var privateKEY = fs.readFileSync('./app/middleware/private.key', 'utf8');
const signOptions = {
    expiresIn: '1d',
    algorithm: "RS256"
}

async function validateEmail(email) {
    var Regex = /(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@[*[a-zA-Z0-9-]+.[a-zA-Z0-9-.]+]*/
    return Regex.test(email);
}

async function validatePhoneNumber(phone_number) {
    var Regex = /^\d{10}$/
    return Regex.test(phone_number);
}

exports.register = async (req, res) => {
    try {
        if (await validateEmail(req.body.email)) {
            //true //valid
            if (await validatePhoneNumber(req.body.phone)) {
                //true //valid
                const checkUser = await users.findOne({
                    where: db.sequelize.literal(`email='${req.body.email}' OR phone='${req.body.phone}'`)
                })
                if (!checkUser) {
                    req.body.password = bcrypt.hashSync(req.body.password, null, null).toString();
                    users.create(req.body).then(_user => {
                        _user.password = undefined
                        return res.status(200).json(_user)
                    })
                }
                else {
                    return res.status(400).json({ msg: 'Email or phone number already exists' })
                }
            }
            else {
                return res.status(400).json({ msg: 'Phone number is invalid' })
            }
        }
        else {
            return res.status(400).json({ msg: 'Email is invalid' })
        }
    }
    catch (err) {
        return res.status(400).json({ msg: err })
    }


    // users.findAll({ where: { username: req.body.username } }).then(user => {
    //     if (user.length >= 1)
    //         return res.status(403).json({ msg: 'Username already exists' })
    //     req.body.password = bcrypt.hashSync(req.body.password, null, null).toString();
    //     users.create(req.body).then(_user => {
    //         _user.password = undefined
    //         return res.status(200).json(_user)
    //     }).catch(err => {
    //         return res.status(400).json({ msg: err })
    //     })
    // })
}

exports.login = async (req, res) => {
    //login by email or phone
    try {
        var query;
        if (await validateEmail(req.body.username)) {
            //login by email
            query = {
                where: {
                    email: req.body.username
                }
            }
        }
        else {
            if (await validatePhoneNumber(req.body.username)) {
                //login by phone
                query = {
                    where: {
                        phone: req.body.username
                    }
                }
            }
            else {
                //err params
                return res.status(404).json({ msg: 'Params is invalid' })
            }
        }
        users.findOne(query).then(async _user => {
            if (!_user)
                return res.status(404).json({ msg: 'Username is not exists' })
            if (bcrypt.compareSync(req.body.password, _user.password)) {
                const token = jwt.sign(
                    {
                        username: _user.username,
                        id: _user.id
                    },
                    privateKEY,
                    signOptions
                )
                _user.password = undefined
                return res.status(200).json({
                    msg: 'Auth successful',
                    token: token,
                    profile: _user
                })
            }
            else
                return res.status(402).json({ msg: 'Password is not corect' })
        }).catch(err => {
            return res.status(400).json({ msg: err })
        })
    }
    catch (err) {
        return res.status(400).json({ msg: err })
    }
}

exports.me = (req, res) => {
    const _user = req.userData;
    _user.password = undefined;
    return res.status(200).json({
        msg: 'Auth successful',
        profile: _user
    })
}