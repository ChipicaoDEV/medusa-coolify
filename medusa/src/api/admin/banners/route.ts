import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BANNER_MODULE } from "../../../modules/banner"
import BannerModuleService from "../../../modules/banner/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const bannerService: BannerModuleService = req.scope.resolve(BANNER_MODULE)

  const banners = await bannerService.listBanners(
    {},
    { order: { sort_order: "ASC" } }
  )

  res.json({ banners })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const bannerService: BannerModuleService = req.scope.resolve(BANNER_MODULE)

  const banner = await bannerService.createBanners(req.body as any)

  res.json({ banner })
}
