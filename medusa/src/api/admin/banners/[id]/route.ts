import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BANNER_MODULE } from "../../../../modules/banner"
import BannerModuleService from "../../../../modules/banner/service"

export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const bannerService: BannerModuleService = req.scope.resolve(BANNER_MODULE)
  const { id } = req.params

  const banner = await bannerService.updateBanners({ id, ...(req.body as any) })

  res.json({ banner })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const bannerService: BannerModuleService = req.scope.resolve(BANNER_MODULE)
  const { id } = req.params

  await bannerService.deleteBanners(id)

  res.json({ deleted: true })
}
