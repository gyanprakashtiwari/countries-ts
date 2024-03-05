import express, { Request, Response, NextFunction } from 'express';
import mongoose, { Types } from 'mongoose';
import Country from '../models/country/country';
import CountryNeighbours from '../models/country/country_neighbour';

const router = express.Router();

// Get Countries List Paginated with sort by options name , population & area both ascending and descending
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
    const page: number = parseInt(req.query.page as string) || 1;
    const limit: number = parseInt(req.query.limit as string) || 10;
    const sortParams: string[] = req.query.sort_by ? (req.query.sort_by as string).split(",") : ["name_asc"];

    if (page < 1) {
        return res.status(400).json({ message: "Invalid page number. Page number must be greater than or equal to 1." });
    }

    const sortOptions: any = {};
    sortParams.forEach(param => {
        const [field, order] = param.split("_");
        const sortOrder = order.toLowerCase() === "desc" ? -1 : 1;
        sortOptions[field] = sortOrder;
    });

    try {
        const totalCountries = await Country.countDocuments();
        const countries = await Country.find()
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(limit);

        const totalPages = Math.ceil(totalCountries / limit);

        if (page > totalPages) {
            return res.status(404).json({ message: "Requested page not found. Exceeds the total number of pages." });
        }

        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;

        const response = {
            message: "List of Countries",
            data: {
                countries,
                currentPage: page,
                totalCountries,
                totalPages,
                hasNextPage,
                hasPreviousPage
            }
        };

        res.status(200).json(response);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: (err as Error).message });
    }
});

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
    const country = new Country({
        _id: new mongoose.Types.ObjectId(),
        name: req.body.name,
        cca: req.body.cca,
        currency_code: req.body.currency_code,
        currency: req.body.currency,
        capital: req.body.capital,
        region: req.body.region,
        subregion: req.body.subregion,
        area: req.body.area,
        map_url: req.body.map_url,
        population: req.body.population,
        flag_url: req.body.flag_url
    });

    try {
        const result = await country.save();
        console.log(result);
        const response = {
            name: result.name,
            _id: result._id,
            request: {
                type: "GET",
                url: `${req.protocol}://${req.get('host')}${req.originalUrl}/${result._id}`
            }
        };
        res.status(201).json(response);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: (err as Error).message });
    }
});

router.get("/:countryId", async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.countryId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid country ID format" });
    }

    try {
        const doc = await Country.findById(id).exec();
        console.log("From database", doc);
        
        if (doc) {
            res.status(200).json(doc);
        } else {
            res.status(404).json({ message: "No valid country found for country ID" });
        }
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: (err as Error).message });
    }
});

router.get("/:countryId/neighbours", async (req: Request, res: Response, next: NextFunction) => {
    const countryId = req.params.countryId as string;
    const perPage = parseInt(req.query.per_page as string) || 10;
    const page = parseInt(req.query.page as string) || 1;

    if (!mongoose.Types.ObjectId.isValid(countryId)) {
        return res.status(400).json({ message: "Invalid country ID format" });
    }

    try {
        const totalNeighbours = await CountryNeighbours.countDocuments({ country_id: countryId }).exec();
        const totalPages = Math.ceil(totalNeighbours / perPage);

        const neighbours = await CountryNeighbours.find({ country_id: countryId })
            .select('neighbour_country_id')
            .skip((page - 1) * perPage)
            .limit(perPage)
            .exec();

        const neighbourIds = neighbours.map(neighbour => neighbour.neighbour_country_id);

        const countries = await Country.find({ _id: { $in: neighbourIds } }).exec();

        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;

        res.status(200).json({
            message: "Neighbour Countries",
            data: {
                neighbour_countries: countries,
                total: totalNeighbours,
                hasNextPage,
                hasPreviousPage,
                totalPages,
                page,
                per_page: perPage
            }
        });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: (err as Error).message });
    }
});


router.post("/:countryId/neighbours", async (req: Request, res: Response, next: NextFunction) => {
    const countryId = req.params.countryId;
    const neighbourId = req.body.neighbour_country_id;

    if (!mongoose.Types.ObjectId.isValid(countryId) || !mongoose.Types.ObjectId.isValid(neighbourId)) {
        return res.status(400).json({ message: "Invalid country ID or neighbour_country_id format" });
    }

    try {
        const [country, neighbour] = await Promise.all([
            Country.findById(countryId).exec(),
            Country.findById(neighbourId).exec()
        ]);

        if (!country || !neighbour) {
            return res.status(404).json({ message: "One or more countries not found" });
        }

        const existingNeighbour = await CountryNeighbours.findOne({ country_id: countryId, neighbour_country_id: neighbourId }).exec();

        if (existingNeighbour) {
            return res.status(400).json({ message: "These countries are already neighbours" });
        }

        const newNeighbour = new CountryNeighbours({
            country_id: countryId,
            neighbour_country_id: neighbourId
        });

        await newNeighbour.save();

        res.status(201).json({ message: "Neighbour added successfully" });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: (err as Error).message });
    }
});

router.patch("/:CountryId", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.CountryId;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid Country ID format" });
        }

        const updateOps = req.body.reduce((ops : any, { propName, value } : any) => {
            ops[propName] = value;
            return ops;
        }, {});

        const result = await Country.updateOne({ _id: id }, { $set: updateOps });

        if (result.matchedCount === 1) {
            res.status(200).json({ message: "Country updated successfully" });
        } else {
            res.status(404).json({ message: "No valid Country found for provided ID" });
        }
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: (err as Error).message });
    }
});

export default router;
