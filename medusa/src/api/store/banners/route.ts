import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BANNER_MODULE } from "../../../modules/banner"
import BannerModuleService from "../../../modules/banner/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const bannerService: BannerModuleService = req.scope.resolve(BANNER_MODULE)

  const banners = await bannerService.listBanners(
    { is_active: true },
    { order: { sort_order: "ASC" } }
  )

  res.json({ banners })
}
