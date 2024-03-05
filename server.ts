import * as dotenv from 'dotenv';
dotenv.config();

import * as http from 'http';
import app from './app';

const port: number = parseInt(process.env.PORT as string, 10) || 3000;

const server: http.Server = http.createServer(app);
server.listen(port);
