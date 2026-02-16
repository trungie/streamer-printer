# Local dev rendering — runs Wine + wkhtmltopdf.exe via dev/test-render.sh
# Usage: make <target>              (continuous PDF, default)
#        make <target> PAGINATED=1  (fixed page size, matches production)
#        make <target> IMG=1        (PNG image instead)
#        make <target> SIZE=A5      (custom paper size)
#        make <target> KEEP=1       (keep intermediate HTML for debugging)

RENDER := ./dev/test-render.sh
FLAGS  :=

ifdef SIZE
  FLAGS += -s $(SIZE)
endif
ifdef IMG
  FLAGS += -i
endif
ifdef KEEP
  FLAGS += -k
endif
ifdef PAGINATED
  FLAGS += -p
endif

# --- Individual event types ---

streamelements-tip:
	$(RENDER) $(FLAGS) dev/samples/streamelements-tip.json

streamlabs-tip:
	$(RENDER) $(FLAGS) dev/samples/streamlabs-tip.json

sub:
	$(RENDER) $(FLAGS) dev/samples/sub.json

resub:
	$(RENDER) $(FLAGS) dev/samples/resub.json

gift-sub:
	$(RENDER) $(FLAGS) dev/samples/gift-sub.json

gift-bomb:
	$(RENDER) $(FLAGS) dev/samples/gift-bomb.json

raid:
	$(RENDER) $(FLAGS) dev/samples/raid.json

cheer:
	$(RENDER) $(FLAGS) dev/samples/cheer.json

follow:
	$(RENDER) $(FLAGS) dev/samples/follow.json

fortune:
	$(RENDER) $(FLAGS) dev/samples/fortune.json

print-text:
	$(RENDER) $(FLAGS) dev/samples/print-text.json

aprilfools:
	$(RENDER) $(FLAGS) dev/samples/streamelements-tip-aprilfools.json

aprilfools-ai:
	$(RENDER) $(FLAGS) dev/samples/streamelements-tip-aprilfools-ai.json

# --- Batch targets ---

all: sub resub gift-sub gift-bomb raid cheer follow streamelements-tip streamlabs-tip fortune print-text aprilfools aprilfools-ai

setup:
	sudo ./dev/setup.sh

clean:
	rm -f dev/output/*
	@echo "Cleaned dev/output/"

.PHONY: sub resub gift-sub gift-bomb raid cheer follow streamelements-tip streamlabs-tip fortune print-text aprilfools aprilfools-ai all setup clean
