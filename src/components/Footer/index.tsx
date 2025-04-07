import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">About</h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link
                  href="/contact-about/chef-story"
                  className="text-base text-gray-500 hover:text-gray-900"
                >
                  Chef&apos;s Story
                </Link>
              </li>
              <li>
                <Link
                  href="/contact-about/location-hours"
                  className="text-base text-gray-500 hover:text-gray-900"
                >
                  Location & Hours
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">
              Support
            </h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link
                  href="/contact-about/contact-form"
                  className="text-base text-gray-500 hover:text-gray-900"
                >
                  Contact Form
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-base text-gray-500 hover:text-gray-900">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="text-base text-gray-500 hover:text-gray-900">
                  Shipping
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Legal</h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link href="/privacy" className="text-base text-gray-500 hover:text-gray-900">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-base text-gray-500 hover:text-gray-900">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/refund" className="text-base text-gray-500 hover:text-gray-900">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">
              Offerings
            </h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link href="/alfajores" className="text-base text-gray-500 hover:text-gray-900">
                  Our Alfajores
                </Link>
              </li>
              <li>
                <Link href="/catering" className="text-base text-gray-500 hover:text-gray-900">
                  Our Catering
                </Link>
              </li>
              <li>
                <Link href="/empanadas" className="text-base text-gray-500 hover:text-gray-900">
                  Our Empanadas
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-200 pt-8">
          <p className="text-base text-gray-400 text-center">
            © {new Date().getFullYear()} Destino SF. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
