import type { ComponentType, ForwardRefExoticComponent, HTMLAttributes, ReactNode, RefAttributes } from "react"

export type CardSwapProps = {
  width?: number | string
  height?: number | string
  cardDistance?: number
  verticalDistance?: number
  delay?: number
  pauseOnHover?: boolean
  onCardClick?: (idx: number) => void
  skewAmount?: number
  easing?: "linear" | "elastic"
  children: ReactNode
}

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  customClass?: string
  children?: ReactNode
}

declare const CardSwap: ComponentType<CardSwapProps>
export const Card: ForwardRefExoticComponent<CardProps & RefAttributes<HTMLDivElement>>
export default CardSwap
