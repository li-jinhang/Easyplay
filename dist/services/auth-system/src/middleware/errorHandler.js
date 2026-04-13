function n(s,r,o,a){const e=s.statusCode||500,t=s.message||"服务器内部错误";e>=500&&console.error(s),o.status(e).json({error:t})}module.exports={errorHandler:n};
