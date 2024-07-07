var nodemailer=require('nodemailer')

const sendmail=(name,email,otp)=>{
    let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure:true,
        auth: {
          user: "shoemart0123@gmail.com",
          pass: "rdkc ktxh bryl ladi",
        },
      }); 
      let info =  transporter.sendMail({
        from: '"Shoe Mart " <shoemart0123@gmail.com>', // sender address
        to: email, // list of receivers
        subject: `Hellow ${name}`, // Subject line
        text: `Your OTP is: ${otp}`, // plain text body
        html: `<b>Your OTP is: ${otp}</b>`, // html body
      }); 
};
module.exports= {sendmail}