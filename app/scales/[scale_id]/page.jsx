// app/scales/[scale_id]/page.js
import clientPromise from "@/lib/mongodb";

export default async function ScaleDetailPage({ params }) {
  const client = await clientPromise;
  const db = client.db();
  const collection = db.collection("scales");

  const scale = await collection.findOne({ scale_id: params.scale_id });

  if (!scale) {
    return <div>Scale not found</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        📊 Scale {scale.serial_number} Graphs
      </h1>

      {/* Here you can use a Chart component to render data */}
      {/* Example: <WeightChart data={scale.measurements} /> */}
    </div>
  );
}
