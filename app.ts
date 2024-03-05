import express, { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import countryRoutes from './api/routes/country';

const app = express();

app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, GET, DELETE');
        return res.status(200).json({});
    }
    next();
});

mongoose.connect(
    process.env.DATABASE_URI as string
);
mongoose.Promise = global.Promise;

app.use(morgan('dev'));
app.use(express.json());

app.use('/countries', countryRoutes);

app.use((req: Request, res: Response, next: NextFunction) => {
    res.status(200).send('<h1>Countries Assignment API setup completed</h1>');
    next();
});

app.use((error: any, req: Request, res: Response, next: NextFunction) => {
    res.status(error.status || 500);
    res.json({
        error: {
            message: error.message
        }
    });
});

export default app;
