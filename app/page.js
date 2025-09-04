const HomePage = () => {
  return (
    <div className="h-screen flex items-start justify-center p-8 dark:text-gray-500">
      <div className="md:w-1/2 p-2 md:p-6 shadow-lg shadow-amber-200 rounded-lg">
        <h1 className="text-2xl md:text-3xl font-bold mb-4">
          About the Beehive Data Project
        </h1>

        <p className="mb-2 md:mb-4">
          The BiData project is funded by the European Agricultural Fund for
          Rural Development (EAFRD) and runs from 1.11.2023 to 31.10.2025. The
          project aims to create a common platform for automated data collection
          from beehives in Åland, a collaboration between the University of
          Åland and partners in Åland agriculture.
        </p>

        <p className="mb-2 md:mb-4">
          The goal of the project is to create conditions for reduced winter
          losses of bee colonies, improved honey harvest, and optimized
          pollination of crops such as apples.
        </p>

        <p className="mb-2 md:mb-4">
          Through a network of connected hive scales with temperature sensors,
          connected to a public platform for data visualization (bidata.site),
          beekeepers can see developments in different hives without physically
          visiting hives. This way they can create a good basis for measures in
          beekeeping.
        </p>
      </div>
    </div>
  );
};

export default HomePage;
