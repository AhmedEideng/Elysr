const fs = require("fs");

let content = fs.readFileSync("src/data/articles.ts", "utf8");

const images = [
  '"https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&q=80&w=800"', // sexual-health-basics
  '"https://images.unsplash.com/photo-1516585427167-9f4af9627e6c?auto=format&fit=crop&q=80&w=800"', // communication-couples
  '"https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=800"', // nutrition-libido
  '"https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&q=80&w=800"', // erectile-dysfunction
  '"https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800"', // premature-ejaculation
  '"https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&q=80&w=800"', // women-orgasm
  '"https://images.unsplash.com/photo-1559598467-f8b76c8155d0?auto=format&fit=crop&q=80&w=800"', // hormonal-changes
  '"https://images.unsplash.com/photo-1584308666744-24d5c474f2ad?auto=format&fit=crop&q=80&w=800"', // safe-supplements
  '"https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&q=80&w=800"', // stress-and-libido
  '"https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=800"', // kegel-exercises
  '"https://images.unsplash.com/photo-1511295742362-92c96b12a806?auto=format&fit=crop&q=80&w=800"', // sleep-and-sex
  '"https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&q=80&w=800"', // std-prevention
  '"https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=800"', // contraception-options
  '"https://images.unsplash.com/photo-1514339908127-1eafeafc7866?auto=format&fit=crop&q=80&w=800"', // aging-and-intimacy
  '"https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&q=80&w=800"', // post-partum-recovery
  '"https://images.unsplash.com/photo-1499714608240-22fc6ad53cb2?auto=format&fit=crop&q=80&w=800"', // masturbation-myths
  '"https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?auto=format&fit=crop&q=80&w=800"', // body-image-confidence
  '"https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&q=80&w=800"', // foods-to-avoid
  '"https://images.unsplash.com/photo-1596503923363-228723c72b22?auto=format&fit=crop&q=80&w=800"', // aphrodisiacs-real
  '"https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=800"', // when-to-see-doctor
];

let i = 0;
// We need to inject the image param at the end of each `a(...)` block.
// A simpler way: we know each article definition ends with `,` or `)` depending on how it's written.
// Looking at the data, it's `a("slug", "title", "excerpt", "category", readMin, "emoji", `content`),`
content = content.replace(/(`[^`]+`)(,\s*)?(?=\)[,\n])/g, (match, p1) => {
  if (i < images.length) {
    const res = `${p1}, ${images[i]}`;
    i++;
    return res;
  }
  return match;
});

fs.writeFileSync("src/data/articles.ts", content);
