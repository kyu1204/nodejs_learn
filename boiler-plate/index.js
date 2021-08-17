const express = require('express')
const app = express()
const port = 3000
const config = require('./config/key');
const cookieParser = require('cookie-parser')
const { auth } = require('./middleware/auth')
const { refresh } = require('./middleware/auth')
const { User } = require('./modles/User');


app.use(cookieParser())
app.use(express.urlencoded({ extended: true }))
app.use(express.json())


const mongoose = require('mongoose')
mongoose.connect(config.mongoURI, {
  useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: true
}).then(() => console.log('MongoDB Connected!'))
  .catch(err => console.log(err))

app.get('/', (req, res) => {
  res.send('Hello World!')
})

// 회원가입
app.post('/api/users/register', (req, res) => {
  const user = new User(req.body)

  user.save((err, userInfo) => {
    if (err) return res.json({ success: false, err })
    return res.status(200).json({ success: true })
  })
})

// 로그인
app.post('/api/users/login', (req, res) => {
  // 요청된 email 확인
  User.findOne({ email: req.body.email }, (err, user) => {
    if (!user) {
      return res.json({ loginSuccess: false, message: 'auth error' })
    }

    // 요청된 email의 password 확인
    user.comparePassword(req.body.password, (err, isMatch) => {
      if (!isMatch)
        return res.json({ loginSuccess: false, message: "auth error" })

      // 토큰 생성하기
      user.generateToken((err, user, access_token) => {
        if (err) return res.status(400).send(err)

        // 토큰을 보낸다. (access_token, refresh_token)
        res.status(200)
          .cookie('__sid', user.token, { 'httpOnly': true })
          .json({
            loginSuccess: true,
            userId: user._id,
            access_token: access_token
          })
      })
    })
  })
})

// 인증
app.get('/api/users/auth', auth, (req, res) => {
  // 미들웨어에서 auth 처리, not error, not return -> auth success
  res.status(200).json({
    _id: req.user._id,
    isAdmin: req.user.role === 0 ? false : true,
    isAuth: true,
    email: req.user.email,
    name: req.user.name,
    lastname: req.user.lastname,
    role: req.user.role,
    image: req.user.image
  })
})

// 토큰 Refresh
app.put('/api/users/refresh', refresh, (req, res) => {
  // 미들웨어에서 auth 처리, not error, not return -> auth success
  res.status(200)
    .cookie('__sid', req.user.token, { 'httpOnly': true })
    .json({
      refreshSuccess: true,
      userId: req.user._id,
      access_token: req.token
    })
})

// 로그아웃
app.get('/api/users/logout', auth, (req, res) => {
  User.findOneAndUpdate({ _id: req.user._id }, { token: "" }, (err, user) => {
    if (err) return res.json({ success: false, err })
    return res.status(200).json({ success: true })
  })
})

// server run
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})