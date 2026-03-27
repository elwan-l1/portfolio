import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ThemePreview() {
  return (
    <div className="min-h-screen bg-background text-foreground p-10 space-y-10">
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
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      <section className="space-y-4 max-w-md">
        <Input placeholder="Input (input / border / ring)" />
        <div className="flex gap-2">
          <Button>Submit</Button>
          <Button variant="secondary">Cancel</Button>
        </div>
      </section>

      {/* SECTION: Muted */}
      <section className="p-6 bg-muted text-muted-foreground rounded-lg">
        This is muted background with muted-foreground text.
      </section>

      {/* SECTION: Destructive */}
      <section className="p-6 bg-destructive text-white rounded-lg">
        Destructive color (error / danger)
      </section>

      {/* SECTION: Borders */}
      <section className="p-6 border border-border rounded-lg">
        This shows your border color
      </section>

      {/* SECTION: Sidebar */}
      <section className="flex">
        <div className="w-64 p-4 bg-sidebar text-sidebar-foreground border-r border-sidebar-border space-y-4">
          <div className="p-2 bg-sidebar-primary text-sidebar-primary-foreground rounded">
            Sidebar Primary
          </div>
          <div className="p-2 bg-sidebar-accent text-sidebar-accent-foreground rounded">
            Sidebar Accent
          </div>
        </div>

        <div className="flex-1 p-6">Main content next to sidebar</div>
      </section>

      {/* SECTION: Chart Colors */}
      <section className="flex gap-4">
        <div className="w-16 h-16 rounded bg-[hsl(var(--chart-1))]" />
        <div className="w-16 h-16 rounded bg-[hsl(var(--chart-2))]" />
        <div className="w-16 h-16 rounded bg-[hsl(var(--chart-3))]" />
        <div className="w-16 h-16 rounded bg-[hsl(var(--chart-4))]" />
        <div className="w-16 h-16 rounded bg-[hsl(var(--chart-5))]" />
      </section>
    </div>
  );
}
