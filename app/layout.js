import './globals.css'

export const metadata = {
  title: 'BeeHives Project',
  keywords: 'scales, production, measurements',
  description: 'check evolution oof behives data'
}

const MainLayout = ({children}) => {
  return ( 
    <html>
      <body>
        <main>{children}</main>
      </body>
    </html>
   );
}
 
export default MainLayout;