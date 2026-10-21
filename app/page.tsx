import { createClient } from "@/lib/supabase/server";
import { Analyzer } from "@/components/Analyzer";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return (
    <>
      <h1>See your fingers. Play better.</h1>
      <p className="lead">
        Upload a side-view clip of your piano playing. I’ll track every finger, show you where your hand
        technique can improve, and link lessons that fit.
      </p>
      <Analyzer signedIn={!!data.user} />
    </>
  );
}
