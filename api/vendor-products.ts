import { intParam, json, route } from './_lib/http.js'
import { vendorProducts } from './_lib/localline.js'

/** GET /api/vendor-products?vendor=<Local Line vendor id> → Product[] */
export const GET = route(async (request) => json(await vendorProducts(intParam(request, 'vendor')), { cache: 60 }))
