import logo from "data-base64:~assets/color-hub-logo.png"

import { cn } from "~lib/cn"

interface ColorHubLogoProps {
  className?: string
  size?: number
}

const ColorHubLogo = ({ className, size = 24 }: ColorHubLogoProps) => {
  return (
    <div
      className={cn(
        "flex items-center gap-1 text-lg font-mono tracking-wider",
        className
      )}>
      <img src={logo} alt="Color Hub" style={{ width: size, height: size }} />
      <span>color_hub</span>
    </div>
  )
}

export default ColorHubLogo
