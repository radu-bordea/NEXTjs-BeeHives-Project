import Footer from './components/Footer';
import Navbar from './components/Navbar';
import './globals.css'

export const metadata = {
  title: 'BeeHives Project',
  keywords: 'scales, production, measurements',
  description: 'check evolution oof behives data'
}

const MainLayout = ({children}) => {
  return ( 
    <html lang='en'>
      <body className='flex flex-col min-h-screen'>
        <Navbar/>
        <main className='flex-grow'>{children}</main>
        <Footer/>
      </body>
    </html>
   );
}
 
export default MainLayout;