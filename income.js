import 'dotenv/config';

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

const response = await fetch(
    'https://devapi.sotto.li/api/income/summary',
    {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        }
    }
);

console.log('HTTP Status:', response.status);

const data = await response.json();

console.log(
    JSON.stringify(data, null, 2)
);