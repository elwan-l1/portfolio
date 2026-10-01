import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ThemePreview() {
  return (
    <div className="bg-background text-foreground min-h-screen space-y-10 p-10">
      {/* SECTION: Typography */}
      <section className="space-y-2">
        <h1 className="text-4xl font-bold">Theme Preview</h1>
        <p className="text-muted-foreground">
          This page shows all your shadcn color tokens in action.
        </p>
      </section>

      {/* SECTION: Buttons */}
      <section className="flex flex-wrap gap-4">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
      </section>

      {/* SECTION: Cards */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="bg-card text-card-foreground border-border">
          <CardHeader>
            <CardTitle>Card</CardTitle>
          </CardHeader>
          <CardContent>
            This uses <code>card / card-foreground</code>
          </CardContent>
        </Card>

        <Card className="bg-secondary text-secondary-foreground">
          <CardHeader>
            <CardTitle>Secondary</CardTitle>
          </CardHeader>
          <CardContent>Secondary surface color</CardContent>
        </Card>

        <Card className="bg-accent text-accent-foreground">
          <CardHeader>
            <CardTitle>Accent</CardTitle>
          </CardHeader>
          <CardContent>Accent surface color</CardContent>
        </Card>
      </section>

      {/* SECTION: Inputs */}
      <section className="max-w-md space-y-4">
        <Input placeholder="Input (input / border / ring)" />
        <div className="flex gap-2">
          <Button>Submit</Button>
          <Button variant="secondary">Cancel</Button>
        </div>
      </section>

      {/* SECTION: Muted */}
      <section className="bg-muted text-muted-foreground rounded-lg p-6">
        This is muted background with muted-foreground text.
      </section>

      {/* SECTION: Destructive */}
      <section className="bg-destructive rounded-lg p-6 text-white">
        Destructive color (error / danger)
      </section>

      {/* SECTION: Borders */}
      <section className="border-border rounded-lg border p-6">
        This shows your border color
      </section>

      {/* SECTION: Sidebar */}
      <section className="flex">
        <div className="bg-sidebar text-sidebar-foreground border-sidebar-border w-64 space-y-4 border-r p-4">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground rounded p-2">
            Sidebar Primary
          </div>
          <div className="bg-sidebar-accent text-sidebar-accent-foreground rounded p-2">
            Sidebar Accent
          </div>
        </div>

        <div className="flex-1 p-6">Main content next to sidebar</div>
      </section>

      {/* SECTION: Chart Colors */}
      <section className="flex gap-4">
        <div className="h-16 w-16 rounded bg-[hsl(var(--chart-1))]" />
        <div className="h-16 w-16 rounded bg-[hsl(var(--chart-2))]" />
        <div className="h-16 w-16 rounded bg-[hsl(var(--chart-3))]" />
        <div className="h-16 w-16 rounded bg-[hsl(var(--chart-4))]" />
        <div className="h-16 w-16 rounded bg-[hsl(var(--chart-5))]" />
      </section>
    </div>
  );
}
