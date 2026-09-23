import { Header } from './sections/Header'
import { GardenScrollExperience } from './sections/GardenScrollExperience'
import { About } from './sections/About'
import { Services } from './sections/Services'
import { Interlude } from './sections/Interlude'
import { Portfolio } from './sections/Portfolio'
import { BeforeAfter } from './sections/BeforeAfter'
import { Process } from './sections/Process'
import { WhyUs } from './sections/WhyUs'
import { Testimonials } from './sections/Testimonials'
import { CTA } from './sections/CTA'
import { Contact } from './sections/Contact'
import { Footer } from './sections/Footer'
import { WhatsAppFab } from './components/WhatsAppFab'
import { useHashLanding } from './hooks/useHashLanding'

export default function App() {
  useHashLanding()

  return (
    <>
      <Header />
      <main id="main">
        <GardenScrollExperience />
        <About />
        <Services />
        <Interlude />
        <Portfolio />
        <BeforeAfter />
        <Process />
        <WhyUs />
        <Testimonials />
        <CTA />
        <Contact />
      </main>
      <Footer />
      <WhatsAppFab />
    </>
  )
}
