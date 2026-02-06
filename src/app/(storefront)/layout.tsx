import { Footer } from "../../components/layout/footer";
import { Header } from "../../components/layout/header";

type Props = {
  children: React.ReactNode;
};
export default async function HomepageLayout({ children }: Props) {
  return (
    <main className="min-h-screen">
      <Header />
      {children}
      <Footer />
    </main>
  );
}
